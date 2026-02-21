import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMappings() {
    console.log('Verifying mappings from Supabase question_category_map...');
    const { data: mappings, error: mappingError } = await supabase
        .from('question_category_map')
        .select('*')
        .limit(10);
    if (mappingError) {
        console.error('Error fetching mappings:', mappingError);
    } else {
        console.log(`Found ${mappings?.length || 0} mappings:`, mappings);
    }
}

verifyMappings();
