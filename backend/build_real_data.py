"""
Reads all JSON scraper results from the archive and computes real metrics
for the brand-visibility dashboard.

Usage:
    python build_real_data.py

Outputs computed statistics to console for updating mockData.ts
"""

import json
import os
import re
from collections import Counter, defaultdict

ARCHIVE_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "Archive", "rufus_api_exploration")

FOLDERS = [
    os.path.join(ARCHIVE_ROOT, "bens_original_results"),
    os.path.join(ARCHIVE_ROOT, "pedigree_results"),
    os.path.join(ARCHIVE_ROOT, "pedigree_resultsNew"),
]

# Brand we're tracking visibility for
TARGET_BRAND = "PEDIGREE"
BRAND_DISPLAY_NAME = "Pedigree"

# Known brand keywords to extract from product names
BRAND_KEYWORDS = [
    "PEDIGREE", "GREENIES", "Blue Buffalo", "Purina", "Hill's", "Royal Canin",
    "Milk-Bone", "Whimzees", "DentaLife", "Merrick", "Wellness", "CESAR",
    "Shameless Pets", "IAMS", "NUTRO", "Virbac", "Ark Naturals",
    "BEN'S ORIGINAL", "Uncle Ben", "Eat Regal", "Minute", "Lundberg",
    "Kaizen", "Rice-A-Roni", "Knorr", "TropiClean", "Nylabone",
    "Crumps", "Bocce's", "Zuke", "Natural Bully", "Beggin",
]

PERSONA_MAP = {
    "Picky_Eater": "Picky-Eater Dog Parent",
    "New_Dog_Parent": "Busy New Dog Parent",
    "Multi_Dog_Household": "Multi-Dog Household",
    "late_night_quick_dinner": "Late-Night Quick Dinner",
    "lunch_at_work": "Lunch at Work",
}

TOPIC_DISPLAY = {
    "Picky_Eater": "Picky Eater",
    "New_Dog_Parent": "New Dog Parent",
    "Multi_Dog_Household": "Multi-Dog Household",
    "late_night_quick_dinner": "Late Night Quick Dinner",
    "lunch_at_work": "Lunch at Work",
}


def load_all_results():
    """Load all JSON files from the archive folders."""
    all_results = []
    file_count = 0

    for folder in FOLDERS:
        if not os.path.exists(folder):
            print(f"  Warning: folder not found: {folder}")
            continue

        folder_name = os.path.basename(folder)
        for fname in sorted(os.listdir(folder)):
            if not fname.endswith(".json"):
                continue
            if "DEBUG" in fname or "TEST" in fname:
                continue

            fpath = os.path.join(folder, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)

                if isinstance(data, list):
                    for item in data:
                        if item is None:
                            continue
                        item["_source_folder"] = folder_name
                        item["_source_file"] = fname
                        all_results.append(item)
                    file_count += 1
            except Exception as e:
                print(f"  Error reading {fpath}: {e}")

    print(f"Loaded {len(all_results)} results from {file_count} files")
    return all_results


def extract_brand(product_str):
    """Extract brand name from a product string."""
    for kw in BRAND_KEYWORDS:
        if kw.lower() in product_str.lower():
            return kw
    return None


def compute_metrics(results):
    """Compute all dashboard metrics from raw results."""

    # --- Unique questions ---
    questions_by_text = {}
    for r in results:
        q = r.get("input_question", "")
        if not q:
            continue
        key = q.strip().lower()
        if key not in questions_by_text:
            questions_by_text[key] = {
                "text": r.get("input_question", ""),
                "topic": r.get("topic", "General"),
                "runs": [],
            }
        questions_by_text[key]["runs"].append(r)

    print(f"\nUnique questions: {len(questions_by_text)}")

    # --- Topics ---
    topics = defaultdict(list)
    for idx, (qkey, qdata) in enumerate(questions_by_text.items()):
        topic = qdata["topic"]
        topics[topic].append(str(idx + 1))  # prompt ID

    print(f"Topics: {list(topics.keys())}")

    # --- Competitor mentions (brand extraction from products) ---
    brand_mentions = Counter()
    total_with_products = 0

    for r in results:
        products = r.get("products", [])
        if not products:
            continue
        total_with_products += 1
        mentioned = set()
        for p in products:
            brand = extract_brand(p)
            if brand:
                mentioned.add(brand)
        for b in mentioned:
            brand_mentions[b] += 1

    # Remove target brand from competitors
    target_count = brand_mentions.pop(TARGET_BRAND, 0)
    target_count += brand_mentions.pop("PEDIGREE DENTASTIX", 0)

    total_mentions = sum(brand_mentions.values())
    top_competitors = []
    for brand, count in brand_mentions.most_common(8):
        pct = round(count / total_mentions * 100) if total_mentions else 0
        top_competitors.append({"name": brand, "mentions": count, "percentage": pct})

    print(f"\nTarget brand ({TARGET_BRAND}) mentioned in {target_count} answers")
    print(f"Top competitors: {[(c['name'], c['mentions']) for c in top_competitors[:6]]}")

    # --- Visibility score ---
    # For each unique question, what % of runs had the target brand in products?
    visibility_scores = []
    for qkey, qdata in questions_by_text.items():
        runs_with_brand = 0
        total_runs = len(qdata["runs"])
        for r in qdata["runs"]:
            products = r.get("products", [])
            has_brand = any(TARGET_BRAND.lower() in p.lower() for p in products)
            if has_brand:
                runs_with_brand += 1
        score = round((runs_with_brand / total_runs) * 100) if total_runs > 0 else 0
        visibility_scores.append(score)

    overall_visibility = round(sum(visibility_scores) / len(visibility_scores)) if visibility_scores else 0
    print(f"Overall Visibility Score: {overall_visibility}/100")

    # --- Prompts with real data ---
    prompts = []
    for idx, (qkey, qdata) in enumerate(questions_by_text.items()):
        runs = qdata["runs"]
        topic = qdata["topic"]

        # Compute visibility for this prompt
        runs_with_brand = sum(
            1 for r in runs
            if any(TARGET_BRAND.lower() in p.lower() for p in r.get("products", []))
        )
        vis_score = round((runs_with_brand / len(runs)) * 100) if runs else 0

        # Find top competitor for this prompt
        competitor_counts = Counter()
        for r in runs:
            for p in r.get("products", []):
                b = extract_brand(p)
                if b and b != TARGET_BRAND:
                    competitor_counts[b] += 1
        top_comp = competitor_counts.most_common(1)[0][0] if competitor_counts else None

        # Outcome
        if vis_score >= 50:
            outcome = "brand_wins"
        elif competitor_counts and competitor_counts.most_common(1)[0][1] > runs_with_brand:
            outcome = "competitor_wins"
        else:
            outcome = "no_clear_winner"

        # Journey stage based on question content
        q_lower = qdata["text"].lower()
        if any(w in q_lower for w in ["recommend", "best", "top", "what are"]):
            stage = "Discovery"
        elif any(w in q_lower for w in ["compare", "vs", "difference", "choose"]):
            stage = "Evaluation"
        else:
            stage = "Conversion"

        # Priority based on number of runs
        if len(runs) >= 6:
            priority = "High"
        elif len(runs) >= 3:
            priority = "Medium"
        else:
            priority = "Low"

        # Persona
        persona = PERSONA_MAP.get(topic, "Busy New Dog Parent")

        # Topic ID
        topic_keys = list(topics.keys())
        topic_id = f"t{topic_keys.index(topic) + 1}" if topic in topic_keys else "t1"

        # Coverage - check if answer mentions product details
        has_answer = any(r.get("answer_text") for r in runs)
        has_products_in_answer = runs_with_brand > 0

        prompts.append({
            "id": str(idx + 1),
            "text": qdata["text"],
            "topic": topic,
            "topicId": topic_id,
            "visibilityScore": vis_score,
            "visibilityOutcome": outcome,
            "topCompetitor": top_comp,
            "journeyStage": stage,
            "priority": priority,
            "persona": persona,
            "testRunCount": len(runs),
            "hasProducts": has_products_in_answer,
            "hasCoverage": has_answer,
        })

    # --- Rollup by journey stage ---
    by_stage = defaultdict(lambda: {"scores": [], "total": 0})
    for p in prompts:
        by_stage[p["journeyStage"]]["scores"].append(p["visibilityScore"])
        by_stage[p["journeyStage"]]["total"] += 1

    # --- Rollup by priority ---
    by_priority = defaultdict(lambda: {"scores": [], "total": 0})
    for p in prompts:
        by_priority[p["priority"]]["scores"].append(p["visibilityScore"])
        by_priority[p["priority"]]["total"] += 1

    # --- Coverage breakdown ---
    covered = sum(1 for p in prompts if p["visibilityScore"] >= 50)
    partial = sum(1 for p in prompts if 0 < p["visibilityScore"] < 50)
    not_covered = sum(1 for p in prompts if p["visibilityScore"] == 0)

    coverage_pct = round(covered / len(prompts) * 100, 1) if prompts else 0

    # --- Citation sources (derived from product source patterns) ---
    # Count ASINs = PDP citations, answer presence = organic, follow-up questions = Q&A
    asin_count = sum(1 for r in results if r.get("products"))
    answer_count = sum(1 for r in results if r.get("answer_text"))
    followup_count = sum(1 for r in results if r.get("questions"))
    error_count = sum(1 for r in results if r.get("error"))
    total_citation = asin_count + answer_count + followup_count

    citation_sources = [
        {"name": "Product Listings (PDP)", "mentions": asin_count, "percentage": round(asin_count / total_citation * 100) if total_citation else 0},
        {"name": "AI Answer Content", "mentions": answer_count, "percentage": round(answer_count / total_citation * 100) if total_citation else 0},
        {"name": "Follow-up Questions", "mentions": followup_count, "percentage": round(followup_count / total_citation * 100) if total_citation else 0},
    ]

    return {
        "prompts": prompts,
        "topics": topics,
        "top_competitors": top_competitors,
        "citation_sources": citation_sources,
        "overall_visibility": overall_visibility,
        "coverage_pct": coverage_pct,
        "by_stage": dict(by_stage),
        "by_priority": dict(by_priority),
        "coverage_breakdown": {"covered": covered, "partial": partial, "notCovered": not_covered},
        "total_results": len(results),
        "total_questions": len(questions_by_text),
    }


def print_typescript(metrics):
    """Print TypeScript-ready data structures."""
    print("\n" + "=" * 60)
    print("TYPESCRIPT OUTPUT (paste into mockData.ts)")
    print("=" * 60)

    # Brand name
    print(f"\nexport const brandName = '{BRAND_DISPLAY_NAME}';")

    # Personas
    personas = sorted(set(PERSONA_MAP.values()))
    print(f"\nexport const personas: Persona[] = {json.dumps(personas)};")

    # Topics
    print("\nexport const mockTopics: Topic[] = [")
    for i, (topic_key, prompt_ids) in enumerate(metrics["topics"].items()):
        display = TOPIC_DISPLAY.get(topic_key, topic_key)
        ids_str = json.dumps(prompt_ids[:10])
        print(f"  {{ id: 't{i+1}', name: '{display}', promptIds: {ids_str} }},")
    print("];")

    # Top competitors
    print("\nexport const topCompetitors = [")
    for c in metrics["top_competitors"][:6]:
        print(f"  {{ name: '{c['name']}', mentions: {c['mentions']}, percentage: {c['percentage']} }},")
    print("];")

    # Citation sources
    print("\nexport const topCitationSources = [")
    for s in metrics["citation_sources"]:
        print(f"  {{ name: '{s['name']}', mentions: {s['mentions']}, percentage: {s['percentage']} }},")
    print("];")

    # Rollup metrics summary
    ov = metrics["overall_visibility"]
    cp = metrics["coverage_pct"]
    print(f"\n// Overall Visibility Score: {ov}")
    print(f"// Coverage Percentage: {cp}")
    print(f"// Total questions: {metrics['total_questions']}")
    print(f"// Total scraper results: {metrics['total_results']}")

    # Print stage breakdown
    print("\n// By Journey Stage:")
    for stage, data in metrics["by_stage"].items():
        avg = round(sum(data["scores"]) / len(data["scores"])) if data["scores"] else 0
        above50 = sum(1 for s in data["scores"] if s >= 50)
        pct = round(above50 / len(data["scores"]) * 100) if data["scores"] else 0
        print(f"//   {stage}: avg={avg}, total={data['total']}, above50pct={pct}")

    # Print priority breakdown
    print("\n// By Priority:")
    for pri, data in metrics["by_priority"].items():
        avg = round(sum(data["scores"]) / len(data["scores"])) if data["scores"] else 0
        above50 = sum(1 for s in data["scores"] if s >= 50)
        pct = round(above50 / len(data["scores"]) * 100) if data["scores"] else 0
        print(f"//   {pri}: avg={avg}, total={data['total']}, above50pct={pct}")

    cb = metrics["coverage_breakdown"]
    print(f"\n// Coverage: covered={cb['covered']}, partial={cb['partial']}, notCovered={cb['notCovered']}")

    # Print first 20 prompts for reference
    print("\n// === Sample Prompts ===")
    for p in metrics["prompts"][:20]:
        print(f"//   [{p['id']}] vis={p['visibilityScore']} {p['visibilityOutcome']} | {p['text'][:80]}...")


if __name__ == "__main__":
    print("Loading scraper results from archive...")
    results = load_all_results()

    if not results:
        print("No results found. Check archive paths.")
        exit(1)

    metrics = compute_metrics(results)
    print_typescript(metrics)
