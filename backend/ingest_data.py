import os
import glob
import pandas as pd
import psycopg2
import json
import hashlib
import getpass
import argparse
from datetime import datetime
from psycopg2.extras import Json

# Supabase Connection Details
SB_HOST = "db.kgvvclhueanzksaewvuv.supabase.co"
SB_DB = "postgres"
SB_USER = "postgres"

def get_db_connection():
    password = os.environ.get('PGPASSWORD')
    if not password:
        print(f"Connecting to Supabase ({SB_HOST})...")
        password = getpass.getpass("Enter your Supabase DB Password: ")
    
    conn = psycopg2.connect(
        host=os.environ.get('PGHOST', SB_HOST),
        database=os.environ.get('PGDATABASE', SB_DB),
        user=os.environ.get('PGUSER', SB_USER),
        password=password,
        port=5432
    )
    return conn

def compute_hash(text):
    return hashlib.md5(text.strip().lower().encode('utf-8')).hexdigest()

def clean_text(text):
    if pd.isna(text) or text == '' or str(text).lower() == 'nan':
        return None
    return str(text).strip()

def insert_dimension(cursor, table, column, value):
    if not value: return None
    
    # Check cache/db first
    cursor.execute(f"SELECT id FROM {table} WHERE {column} = %s", (value,))
    res = cursor.fetchone()
    if res:
        return res[0]
    
    slug = value.lower().replace(' ', '-').replace("'", "")[:50]
    cursor.execute(f"SELECT id FROM {table} WHERE slug = %s", (slug,))
    if cursor.fetchone():
        slug = slug + "-" + datetime.now().strftime("%f")[:4]

    try:
        cursor.execute(f"""
            INSERT INTO {table} (name, slug) 
            VALUES (%s, %s) 
            RETURNING id
        """, (value, slug))
        return cursor.fetchone()[0]
    except psycopg2.IntegrityError:
        cursor.connection.rollback()
        cursor.execute(f"SELECT id FROM {table} WHERE {column} = %s", (value,))
        res = cursor.fetchone()
        return res[0] if res else None

def parse_file(filepath):
    """
    Reads CSV or JSON and returns a list of dictionaries with normalized keys:
    - question
    - answer
    - suggested_products (list of strings)
    - suggested_questions (list of strings)
    - timestamp
    - persona
    - category
    - conversation_topic
    """
    rows = []
    filename = os.path.basename(filepath).lower()
    
    # defaults based on filename
    def_persona = "Unknown Persona"
    if 'picky' in filename: def_persona = 'Picky-Eater Dog Parent'
    elif 'multi' in filename: def_persona = 'Multi-Dog Household'
    elif 'new' in filename: def_persona = 'New Dog Parent'
    elif 'bens' in filename: def_persona = 'Bens Original Worker'
    
    def_category = "General"
    if 'dog' in filename or 'picky' in filename or 'multi' in filename: def_category = "Dog Food"
    elif 'bens' in filename or 'rice' in filename: def_category = "Rice"

    try:
        if filepath.endswith('.json'):
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            # Expecting list of {question:..., data: {answer_text:..., products:[], questions:[]}}
            for item in data:
                d = item.get('data', {})
                row = {
                    'question': item.get('question'),
                    'answer': d.get('answer_text'),
                    'suggested_products': d.get('products', []), # already a list
                    'suggested_questions': d.get('questions', []), # already a list
                    'timestamp': datetime.now().isoformat(), # JSON didn't seem to have ts
                    'conversation_topic': 'General', # JSON didn't seem to have topic
                    'persona': def_persona,
                    'category': def_category
                }
                rows.append(row)
                
        else:
            # CSV
            df = pd.read_csv(filepath)
            # Normalize columns
            df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]
            
            for _, df_row in df.iterrows():
                # Split pipe-separated lists
                prods = str(df_row.get('suggested_products', '')).split('|')
                prods = [p.strip() for p in prods if p.strip() and p.lower() != 'nan']
                
                qs = str(df_row.get('suggested_questions', '')).split('|')
                qs = [q.strip() for q in qs if q.strip() and q.lower() != 'nan']
                
                row = {
                    'question': df_row.get('question'),
                    'answer': df_row.get('answer'),
                    'suggested_products': prods,
                    'suggested_questions': qs,
                    'timestamp': df_row.get('timestamp'),
                    'conversation_topic': df_row.get('conversation_topic', 'General'),
                    'persona': df_row.get('persona', def_persona),
                    'category': df_row.get('category', def_category)
                }
                rows.append(row)
                
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        return []

    return rows

def ingest_file(filepath, cursor, company_id):
    print(f"Processing {filepath}...")
    rows = parse_file(filepath)
    if not rows: 
        print(f"No data found in {filepath}")
        return

    # Get/Create Platform
    try:
        cursor.execute("INSERT INTO platforms (name, base_url) VALUES ('Rufus', 'https://rufus.amazon.com') ON CONFLICT DO NOTHING")
        cursor.execute("SELECT id FROM platforms WHERE name = 'Rufus'")
        platform_id = cursor.fetchone()[0]
    except:
        cursor.connection.rollback()
        platform_id = None 

    for index, row in enumerate(rows):
        try:
            # 1. Dimensions
            persona_name = clean_text(row['persona'])
            category_name = clean_text(row['category'])
            
            persona_id = insert_dimension(cursor, 'personas', 'name', persona_name)
            category_id = insert_dimension(cursor, 'categories', 'name', category_name)
            
            # 2. Audit
            audit_name = f"{category_name} Audit - {datetime.now().year}"
            cursor.execute("""
                INSERT INTO audits (company_id, category_id, platform_id, name)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (company_id, category_id, platform_id, audit_name))
            
            cursor.execute("SELECT id FROM audits WHERE company_id=%s AND category_id=%s AND platform_id=%s LIMIT 1", 
                           (company_id, category_id, platform_id))
            audit_id = cursor.fetchone()[0]

            cursor.execute("""
                INSERT INTO audit_personas (audit_id, persona_id)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
            """, (audit_id, persona_id))
            
            cursor.execute("SELECT id FROM audit_personas WHERE audit_id=%s AND persona_id=%s", (audit_id, persona_id))
            res = cursor.fetchone()
            audit_persona_id = res[0] if res else None

            # 3. Question
            q_text = clean_text(row['question'])
            if not q_text: continue
            
            q_hash = compute_hash(q_text)
            
            cursor.execute("SELECT id FROM questions WHERE text_hash = %s", (q_hash,))
            res = cursor.fetchone()
            if res:
                question_id = res[0]
            else:
                try:
                    cursor.execute("INSERT INTO questions (text, priority) VALUES (%s, 'Medium') RETURNING id", (q_text,))
                    question_id = cursor.fetchone()[0]
                except psycopg2.IntegrityError:
                    cursor.connection.rollback()
                    cursor.execute("SELECT id FROM questions WHERE text_hash = %s", (q_hash,))
                    question_id = cursor.fetchone()[0]

            # Links
            cursor.execute("INSERT INTO question_category_map (question_id, category_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (question_id, category_id))
            cursor.execute("INSERT INTO question_persona_map (question_id, persona_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (question_id, persona_id))

            # 4. Run values
            run_date = datetime.now().date()
            ts_str = str(row['timestamp'])
            if ts_str and ts_str.lower() != 'nan' and ts_str != 'None':
                try:
                    if 'T' in ts_str: run_date = datetime.strptime(ts_str.split('T')[0], '%Y-%m-%d').date()
                    else: run_date = pd.to_datetime(ts_str).date()
                except: pass
                
            cursor.execute("""
                INSERT INTO runs (audit_id, run_number, run_date)
                VALUES (%s, 1, %s)
                ON CONFLICT (audit_id, run_number, run_date) DO UPDATE SET status = 'completed'
                RETURNING id
            """, (audit_id, run_date))
            run_id = cursor.fetchone()[0]
            
            # Conversation
            topic = clean_text(row.get('conversation_topic', 'General'))
            
            cursor.execute("SELECT id FROM conversations WHERE audit_persona_id=%s AND topic=%s LIMIT 1", (audit_persona_id, topic))
            res = cursor.fetchone()
            if res:
                conversation_id = res[0]
            else:
                cursor.execute("INSERT INTO conversations (audit_persona_id, topic, thread_index) VALUES (%s, %s, 0) RETURNING id", (audit_persona_id, topic))
                conversation_id = cursor.fetchone()[0]

            turn_index = index 
            cursor.execute("""
                INSERT INTO conversation_turns (conversation_id, question_id, turn_index)
                VALUES (%s, %s, %s)
                ON CONFLICT (conversation_id, turn_index) DO NOTHING
            """, (conversation_id, question_id, turn_index))
            
            cursor.execute("SELECT id FROM conversation_turns WHERE conversation_id=%s AND turn_index=%s", (conversation_id, turn_index))
            conversation_turn_id = cursor.fetchone()[0]

            # Snapshot
            answer_text = clean_text(row['answer'])
            
            # Important: Check if snapshot exists to avoid re-inserting child records if running multiple times
            cursor.execute("SELECT id FROM run_turn_snapshots WHERE run_id=%s AND conversation_turn_id=%s", (run_id, conversation_turn_id))
            snap_res = cursor.fetchone()
            
            if not snap_res and answer_text:
                try:
                    cursor.execute("""
                        INSERT INTO run_turn_snapshots (run_id, conversation_turn_id, answer_text)
                        VALUES (%s, %s, %s)
                        RETURNING id
                    """, (run_id, conversation_turn_id, answer_text))
                    snapshot_id = cursor.fetchone()[0]
                except psycopg2.IntegrityError:
                     cursor.connection.rollback()
                     # Race condition or timestamp mismatch? Schema has unique constraint.
                     cursor.execute("SELECT id FROM run_turn_snapshots WHERE run_id=%s AND conversation_turn_id=%s", (run_id, conversation_turn_id))
                     snap_res = cursor.fetchone()
                     snapshot_id = snap_res[0] if snap_res else None
            else:
                snapshot_id = snap_res[0] if snap_res else None
            
            if not snapshot_id: continue

            # 5. Products
            for rank, p_clean in enumerate(row['suggested_products']):
                if not p_clean: continue
                
                asin = None
                p_name = p_clean
                if '(' in p_clean and ')' in p_clean:
                    try:
                        p_name = p_clean.rsplit('(', 1)[0].strip()
                        asin = p_clean.rsplit('(', 1)[1].replace(')', '').strip()
                    except: pass
                
                if not asin:
                    asin = "GEN-" + hashlib.md5(p_name.encode()).hexdigest()[:10]
                
                cursor.execute("""
                    INSERT INTO products (asin, name, brand) VALUES (%s, %s, 'Unknown')
                    ON CONFLICT (asin) DO UPDATE SET last_seen = now()
                    RETURNING id
                """, (asin, p_name))
                prod_id = cursor.fetchone()[0]
                
                cursor.execute("""
                    INSERT INTO snapshot_products (snapshot_id, product_id, rank)
                    VALUES (%s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (snapshot_id, prod_id, rank))

            # 6. Suggested Questions
            for rank, sq_text in enumerate(row['suggested_questions']):
                sq_text = clean_text(sq_text)
                if not sq_text: continue
                
                sq_hash = compute_hash(sq_text)
                cursor.execute("SELECT id FROM suggested_questions WHERE text_hash = %s", (sq_hash,))
                res = cursor.fetchone()
                if res:
                    sq_id = res[0]
                else:
                    try:
                        cursor.execute("INSERT INTO suggested_questions (text) VALUES (%s) RETURNING id", (sq_text,))
                        sq_id = cursor.fetchone()[0]
                    except psycopg2.IntegrityError:
                        cursor.connection.rollback()
                        cursor.execute("SELECT id FROM suggested_questions WHERE text_hash = %s", (sq_hash,))
                        sq_id = cursor.fetchone()[0]

                cursor.execute("""
                    INSERT INTO snapshot_suggested_questions (snapshot_id, suggested_question_id, rank)
                    VALUES (%s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (snapshot_id, sq_id, rank))
            
            cursor.connection.commit()
            
        except Exception as e:
            cursor.connection.rollback()
            print(f"Error processing row {index} in {filepath}: {e}")
            continue

def main():
    parser = argparse.ArgumentParser(description="Ingest scraped data into Supabase")
    parser.add_argument("path", nargs="?", default=".", help="Directory or file to ingest (default: current directory)")
    args = parser.parse_args()

    try:
        conn = get_db_connection()
        conn.autocommit = False 
        cursor = conn.cursor()
    except Exception as e:
        print(f"Failed to connect: {e}")
        return

    try:
        cursor.execute("INSERT INTO companies (name, slug) VALUES ('Generic Brand', 'generic') ON CONFLICT (slug) DO NOTHING RETURNING id")
        try:
            company_id = cursor.fetchone()[0]
        except:
            cursor.execute("SELECT id FROM companies WHERE slug='generic'")
            company_id = cursor.fetchone()[0]
        conn.commit()
    except Exception as e:
        print(f"Error creating company: {e}")
        return
    
    target_files = []
    if os.path.isfile(args.path):
        target_files = [args.path]
    else:
        # Recursive glob if directory
        # Find matches for both csv and json
        # We walk manually or multiple globs
        search_path = args.path
        for root, dirs, files in os.walk(search_path):
            if 'node_modules' in root: continue
            for file in files:
                if 'node_modules' in file: continue
                
                # Check extension
                if file.endswith('.csv') or file.endswith('.json'):
                    # Check name pattern
                    if 'result' in file.lower() or 'scraper' in file.lower():
                        target_files.append(os.path.join(root, file))
    
    print(f"Found {len(target_files)} files to ingest in '{args.path}'.")
    
    for f in target_files:
        ingest_file(f, cursor, company_id)

    print("Ingestion Complete.")
    conn.close()

if __name__ == "__main__":
    main()
