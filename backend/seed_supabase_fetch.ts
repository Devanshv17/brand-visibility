import { estimateVolume } from '../src/lib/volumeEstimator.js';
import { estimateVisibility } from '../src/lib/visibilityEstimator.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env');
    process.exit(1);
}

const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

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

async function fetchWithTimeout(url, options, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function seed() {
    console.log('Seeding via REST fetch...');
    for (const [slug, questions] of Object.entries(Q_MAP)) {
        const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // Create Category
        let catId = null;
        try {
            const catRes = await fetchWithTimeout(`${supabaseUrl}/rest/v1/categories?on_conflict=slug`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name, slug })
            });
            const catData = await catRes.json();
            if (catData && catData.length > 0) {
                catId = catData[0].id;
                console.log(`Created Category: ${name} (${catId})`);
            } else {
                // Fetch existing
                const exRes = await fetchWithTimeout(`${supabaseUrl}/rest/v1/categories?slug=eq.${slug}&select=id`, { headers });
                const exData = await exRes.json();
                if (exData && exData.length > 0) catId = exData[0].id;
            }
        } catch (e) {
            console.error(`Error creating category ${name}:`, e.message);
            continue;
        }

        if (!catId) {
            console.error('No category ID found for', name);
            continue;
        }

        for (const q of questions) {
            const volume = estimateVolume(q.text);
            const visibility = estimateVisibility(q.text);

            console.log(`  Adding: "${q.text.substring(0, 40)}..." (Vol: ${volume}, Vis: ${visibility.score})`);

            let qId = null;
            try {
                const qRes = await fetchWithTimeout(`${supabaseUrl}/rest/v1/questions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        text: q.text,
                        commerce_stage_primary: q.stage,
                        priority: q.priority,
                        monthly_volume: volume,
                        metadata: {
                            persona: q.persona,
                            visibility_score: visibility.score,
                            visibility_outcome: visibility.outcome
                        }
                    })
                });

                const qData = await qRes.json();
                if (qData && qData.length > 0) {
                    qId = qData[0].id;
                } else if (qData.code === '23505') {
                    // Fetch existing
                    const encoded = encodeURIComponent(q.text);
                    const exRes = await fetchWithTimeout(`${supabaseUrl}/rest/v1/questions?text=eq.${encoded}&select=id`, { headers });
                    const exData = await exRes.json();
                    if (exData && exData.length > 0) qId = exData[0].id;
                }
            } catch (e) {
                console.error('    Error adding question:', e.message);
            }

            if (qId && catId) {
                try {
                    await fetchWithTimeout(`${supabaseUrl}/rest/v1/questions_categories`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ question_id: qId, category_id: catId })
                    });
                    console.log(`    Linked to internal ID: ${qId}`);
                } catch (e) {
                    console.error('    Error linking:', e.message);
                }
            }
        }
    }
    console.log('Seed complete. Exiting gracefully.');
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
