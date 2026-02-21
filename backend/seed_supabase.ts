import { createClient } from '@supabase/supabase-js';
import { estimateVolume } from '../src/lib/volumeEstimator.js';

// Setup supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define categories
const categories = [
    { name: 'Multi-Dog Household', slug: 'multi-dog-household' },
    { name: 'New Dog Parent', slug: 'new-dog-parent' },
    { name: 'Picky Eater', slug: 'picky-eater' },
];

// Define questions per category
// Extracted a subset from mockData for seeding the DB
const Q_MAP = {
    'multi-dog-household': [
        { text: 'I have a multi-dog household and one of my dogs has bad breath—can you recommend a breath-busting dog treat that most dogs will eat?', stage: 'Discovery', priority: 'High', persona: 'Multi-Dog Household' },
        { text: 'I have a multi-dog household, including a new puppy and a senior dog, and both need a grain-free diet. Are there any PEDIGREE® grain-free kibbles suitable for both?', stage: 'Evaluation', priority: 'Medium', persona: 'Multi-Dog Household' },
        { text: 'I need a high-protein breakfast for a busy morning. Which is a better base: Uncle Ben’s Rice or a standard grain mix?', stage: 'Evaluation', priority: 'Low', persona: 'Multi-Dog Household' },
    ],
    'new-dog-parent': [
        { text: 'Is wet dog food or dry kibble better for my new puppy?', stage: 'Evaluation', priority: 'High', persona: 'Busy New Dog Parent' },
        { text: 'How do I choose the best dog food for my 8-week old golden retriever?', stage: 'Discovery', priority: 'High', persona: 'Busy New Dog Parent' },
        { text: 'My new puppy keeps chewing furniture, what safe dog treats or dental chews do you recommend?', stage: 'Conversion', priority: 'High', persona: 'Busy New Dog Parent' },
    ],
    'picky-eater': [
        { text: 'My dog is a very picky eater and refuses dry kibble. Can you recommend a wet dog food or topper that might entice him?', stage: 'Discovery', priority: 'High', persona: 'Picky-Eater Dog Parent' },
        { text: 'Are PEDIGREE Pouches a good option for a picky dog?', stage: 'Evaluation', priority: 'Medium', persona: 'Picky-Eater Dog Parent' },
        { text: 'Where can I buy affordable dog food that a picky eater will actually like?', stage: 'Conversion', priority: 'Medium', persona: 'Picky-Eater Dog Parent' },
    ]
};

async function seed() {
    console.log('Seeding categories...');
    for (const cat of categories) {
        const { data: categoryData, error: catError } = await supabase
            .from('categories')
            .upsert({ name: cat.name, slug: cat.slug }, { onConflict: 'slug' })
            .select('id')
            .single();

        if (catError) {
            console.error('Error inserting category', cat.slug, catError.message);
            continue;
        }
        const catId = categoryData.id;
        console.log(`- Created/found category: ${cat.name} (${catId})`);

        const questions = Q_MAP[cat.slug];
        if (questions) {
            for (const q of questions) {
                const volume = estimateVolume(q.text);

                console.log(`  Adding question: "${q.text.substring(0, 40)}..."`);
                console.log(`  Calculated volume: ${volume} (using MAX keyword volume * 15% * decay)`);

                const { data: qData, error: qError } = await supabase
                    .from('questions')
                    .insert({
                        text: q.text,
                        commerce_stage_primary: q.stage,
                        priority: q.priority,
                        monthly_volume: volume,
                        metadata: { persona: q.persona }
                    })
                    .select('id')
                    .single();

                if (qError) {
                    if (qError.code === '23505') { // UNIQUE constraint violation
                        console.log('    -> Question already exists (hash collision). Skipping.');
                    } else {
                        console.error('    -> Error inserting question:', qError.message);
                    }
                    continue;
                }

                // Link question to category
                const { error: linkError } = await supabase
                    .from('questions_categories')
                    .insert({
                        question_id: qData.id,
                        category_id: catId
                    });

                if (linkError) {
                    console.error('    -> Error linking question to category:', linkError.message);
                } else {
                    console.log('    -> Added & linked successfully.');
                }
            }
        }
    }
    console.log('Seeding complete.');
}

seed().catch(console.error);
