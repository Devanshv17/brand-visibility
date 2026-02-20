"""
Reads all JSON scraper results from the archive and generates
a complete realData.ts file for the brand-visibility dashboard.
"""

import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime

ARCHIVE_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "Archive", "rufus_api_exploration")

FOLDERS = [
    os.path.join(ARCHIVE_ROOT, "pedigree_results"),
    os.path.join(ARCHIVE_ROOT, "pedigree_resultsNew"),
    os.path.join(ARCHIVE_ROOT, "bens_original_results"),
]

TARGET_BRAND = "PEDIGREE"
BRAND_DISPLAY = "Pedigree"

BRAND_KEYWORDS = [
    "PEDIGREE", "GREENIES", "Blue Buffalo", "Purina", "Hill's", "Royal Canin",
    "Milk-Bone", "Whimzees", "DentaLife", "Merrick", "Wellness", "CESAR",
    "Shameless Pets", "IAMS", "NUTRO", "Virbac", "Ark Naturals",
    "BEN'S ORIGINAL", "Uncle Ben", "Eat Regal", "Minute Rice",
    "Lundberg", "Kaizen", "Rice-A-Roni", "Knorr", "TropiClean",
    "Nylabone", "Crumps", "Bocce's", "Zuke", "Beggin",
]

TOPIC_DISPLAY = {
    "Picky_Eater": "Picky Eater",
    "New_Dog_Parent": "New Dog Parent",
    "Multi_Dog_Household": "Multi-Dog Household",
    "late_night_quick_dinner": "Late Night Dinner",
    "lunch_at_work": "Lunch at Work",
}

PERSONA_MAP = {
    "Picky_Eater": "Picky-Eater Dog Parent",
    "New_Dog_Parent": "Busy New Dog Parent",
    "Multi_Dog_Household": "Multi-Dog Household",
}


def load_results():
    results = []
    for folder in FOLDERS:
        if not os.path.exists(folder):
            continue
        folder_name = os.path.basename(folder)
        for fname in sorted(os.listdir(folder)):
            if not fname.endswith(".json") or "DEBUG" in fname or "TEST" in fname:
                continue
            fpath = os.path.join(folder, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, list):
                    for item in data:
                        if item and not item.get("error"):
                            item["_folder"] = folder_name
                            item["_file"] = fname
                            results.append(item)
            except:
                pass
    return results


def extract_brand(product_str):
    for kw in BRAND_KEYWORDS:
        if kw.lower() in product_str.lower():
            return kw
    return None


def escape_ts(s):
    """Escape a string for TypeScript single-quoted string."""
    return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", "")


def run():
    results = load_results()
    print(f"Loaded {len(results)} valid results")

    # Group by unique question
    questions = {}
    for r in results:
        q = r.get("input_question", "").strip()
        if not q:
            continue
        key = q.lower()
        if key not in questions:
            questions[key] = {"text": q, "topic": r.get("topic", "General"), "runs": []}
        questions[key]["runs"].append(r)

    # Build topics
    topic_prompts = defaultdict(list)
    prompts_list = list(questions.values())
    for idx, qdata in enumerate(prompts_list):
        topic_prompts[qdata["topic"]].append(str(idx + 1))

    # Build prompt objects
    topic_keys = list(topic_prompts.keys())

    all_prompts = []
    for idx, qdata in enumerate(prompts_list):
        runs = qdata["runs"]
        topic = qdata["topic"]

        # Visibility: % of runs containing target brand products
        brand_runs = sum(
            1 for r in runs
            if any(TARGET_BRAND.lower() in p.lower() for p in r.get("products", []))
        )
        vis_score = round((brand_runs / len(runs)) * 100) if runs else 0

        # Top competitor
        comp_counts = Counter()
        all_comps_in_runs = []
        for r in runs:
            for p in r.get("products", []):
                b = extract_brand(p)
                if b and b.upper() != TARGET_BRAND:
                    comp_counts[b] += 1
                    all_comps_in_runs.append(b)
        top_comp = comp_counts.most_common(1)[0][0] if comp_counts else None

        # Outcome
        if vis_score >= 50:
            outcome = "brand_wins"
        elif top_comp and comp_counts[top_comp] > brand_runs:
            outcome = "competitor_wins"
        else:
            outcome = "no_clear_winner"

        # Journey stage heuristic
        ql = qdata["text"].lower()
        if any(w in ql for w in ["compare", "vs", "difference", "choose", "better"]):
            stage = "Evaluation"
        elif any(w in ql for w in ["buy", "purchase", "order", "stock up", "switching"]):
            stage = "Conversion"
        else:
            stage = "Discovery"

        # Priority from runs
        priority = "High" if len(runs) >= 5 else ("Medium" if len(runs) >= 3 else "Low")

        persona = PERSONA_MAP.get(topic, "Busy New Dog Parent")
        topic_id = f"t{topic_keys.index(topic) + 1}" if topic in topic_keys else "t1"

        # Coverage
        has_products = brand_runs > 0
        surfaces = []
        if has_products:
            surfaces.append("PDP")
            if any("store" in r.get("answer_text", "").lower() for r in runs):
                surfaces.append("Brand Store")
        if any("Q:" in (r.get("answer_text", "") or "") for r in runs):
            surfaces.append("Q&A")

        cov_status = "Covered" if vis_score >= 50 else ("Partially Covered" if vis_score > 0 else "Not Covered")

        # Get competitor list from first run with products
        comps_mentioned = list(set(all_comps_in_runs))[:4]

        # Get citation types
        citations = []
        if has_products:
            citations.append("Product listing")
        if any(r.get("answer_text") for r in runs):
            citations.append("AI Answer")

        # Volume heuristic based on how many runs have this question
        vol = "5K+" if len(runs) >= 8 else ("2K+" if len(runs) >= 5 else ("1.2K+" if len(runs) >= 3 else "<1K"))

        # Stability
        scores_per_run = []
        for r in runs:
            has = any(TARGET_BRAND.lower() in p.lower() for p in r.get("products", []))
            scores_per_run.append(100 if has else 0)
        stability = "Stable" if len(set(scores_per_run)) == 1 else "Volatile"

        # Get a snippet from the first answer that mentions the brand
        snippet = ""
        for r in runs:
            ans = r.get("answer_text", "")
            if ans and TARGET_BRAND.lower() in ans.lower():
                # Extract ~100 chars around the brand mention
                pos = ans.lower().find(TARGET_BRAND.lower())
                start = max(0, pos - 30)
                end = min(len(ans), pos + 80)
                snippet = ans[start:end].strip()
                break

        all_prompts.append({
            "id": str(idx + 1),
            "text": qdata["text"],
            "journeyStage": stage,
            "priority": priority,
            "persona": persona,
            "monthlyVolume": vol,
            "topicId": topic_id,
            "visibilityScore": vis_score,
            "visibilityOutcome": outcome,
            "topCompetitor": top_comp,
            "competitorsMentioned": comps_mentioned,
            "citations": citations,
            "coverageStatus": cov_status,
            "surfaces": surfaces,
            "snippet": snippet,
            "lastTested": "2026-02-17T14:30:00Z",
            "testRunCount": len(runs),
            "stability": stability,
        })

    # Compute rollup metrics
    vis_scores = [p["visibilityScore"] for p in all_prompts]
    overall_vis = round(sum(vis_scores) / len(vis_scores)) if vis_scores else 0

    covered = sum(1 for p in all_prompts if p["visibilityScore"] >= 50)
    partial = sum(1 for p in all_prompts if 0 < p["visibilityScore"] < 50)
    not_covered = sum(1 for p in all_prompts if p["visibilityScore"] == 0)
    coverage_pct = round(covered / len(all_prompts) * 100, 1) if all_prompts else 0

    # By stage
    stage_data = defaultdict(lambda: {"scores": [], "total": 0})
    for p in all_prompts:
        stage_data[p["journeyStage"]]["scores"].append(p["visibilityScore"])
        stage_data[p["journeyStage"]]["total"] += 1

    # By priority
    pri_data = defaultdict(lambda: {"scores": [], "total": 0})
    for p in all_prompts:
        pri_data[p["priority"]]["scores"].append(p["visibilityScore"])
        pri_data[p["priority"]]["total"] += 1

    # Surface coverage
    surface_counts = Counter()
    for p in all_prompts:
        for s in p["surfaces"]:
            surface_counts[s] += 1

    # Top competitors
    brand_mentions = Counter()
    for r in results:
        seen = set()
        for p in r.get("products", []):
            b = extract_brand(p)
            if b and b.upper() != TARGET_BRAND:
                seen.add(b)
        for b in seen:
            brand_mentions[b] += 1

    total_comp_mentions = sum(brand_mentions.values())
    top_comps = []
    for b, c in brand_mentions.most_common(6):
        pct = round(c / total_comp_mentions * 100) if total_comp_mentions else 0
        top_comps.append({"name": b, "mentions": c, "percentage": pct})

    # Citation sources
    asin_count = sum(1 for r in results if r.get("products"))
    ans_count = sum(1 for r in results if r.get("answer_text"))
    fq_count = sum(1 for r in results if r.get("questions"))
    total_cit = asin_count + ans_count + fq_count

    # ---- Generate TypeScript ----
    output_path = os.path.join(os.path.dirname(__file__), "..", "src", "data", "mockData.ts")
    
    lines = []
    lines.append("import { Prompt, RollupMetrics, Persona, Topic, VisibilityTrendPoint } from '@/types/rufus';")
    lines.append("")
    lines.append(f"export const brandName = '{BRAND_DISPLAY}';")
    lines.append("")

    # Personas
    personas_used = sorted(set(p["persona"] for p in all_prompts))
    lines.append(f"export const personas: Persona[] = {json.dumps(personas_used)};")
    lines.append("")

    # Topics
    lines.append("export const mockTopics: Topic[] = [")
    for i, (tk, pids) in enumerate(topic_prompts.items()):
        display = TOPIC_DISPLAY.get(tk, tk)
        ids = json.dumps(pids[:15])
        lines.append(f"  {{ id: 't{i+1}', name: '{escape_ts(display)}', promptIds: {ids} }},")
    lines.append("];")
    lines.append("")

    # Prompts - limit to 40 most interesting ones (mix of outcomes)
    # Sort: brand_wins first (by score desc), then competitor_wins, then no_clear_winner
    sorted_prompts = sorted(all_prompts, key=lambda p: (-p["visibilityScore"], p["text"]))
    # Take top 15 brand_wins, top 15 competitor_wins, and fill rest
    brand_wins_p = [p for p in sorted_prompts if p["visibilityOutcome"] == "brand_wins"][:15]
    comp_wins_p = [p for p in sorted_prompts if p["visibilityOutcome"] == "competitor_wins"][:15]
    neutral_p = [p for p in sorted_prompts if p["visibilityOutcome"] == "no_clear_winner"][:10]
    selected = brand_wins_p + comp_wins_p + neutral_p

    lines.append("export const mockPrompts: Prompt[] = [")
    for p in selected:
        lines.append("  {")
        lines.append(f"    id: '{p['id']}',")
        lines.append(f"    text: '{escape_ts(p['text'])}',")
        lines.append(f"    journeyStage: '{p['journeyStage']}',")
        lines.append(f"    priority: '{p['priority']}',")
        lines.append(f"    persona: '{escape_ts(p['persona'])}',")
        lines.append(f"    monthlyVolume: '{p['monthlyVolume']}',")
        lines.append(f"    topicId: '{p['topicId']}',")
        lines.append(f"    visibilityScore: {p['visibilityScore']},")
        lines.append(f"    visibilityOutcome: '{p['visibilityOutcome']}',")
        tc = f"'{escape_ts(p['topCompetitor'])}'" if p['topCompetitor'] else "null"
        lines.append(f"    topCompetitor: {tc},")
        lines.append(f"    testResults: [")
        lines.append(f"      {{")
        lines.append(f"        runId: 'r{p['id']}',")
        lines.append(f"        timestamp: '{p['lastTested']}',")
        lines.append(f"        brandMentioned: {str(p['visibilityScore'] > 0).lower()},")
        comps_str = json.dumps(p["competitorsMentioned"][:3])
        lines.append(f"        competitorsMentioned: {comps_str},")
        lines.append(f"        topCompetitor: {tc},")
        lines.append(f"        outcome: '{p['visibilityOutcome']}',")
        cit_str = json.dumps(p["citations"])
        lines.append(f"        citations: {cit_str},")
        lines.append(f"      }},")
        lines.append(f"    ],")
        # Coverage
        lines.append(f"    coverage: {{")
        lines.append(f"      status: '{p['coverageStatus']}',")
        surf_str = json.dumps(p["surfaces"]) if p["surfaces"] else "[]"
        lines.append(f"      surfaces: {surf_str},")
        lines.append(f"      evidence: [")
        if p["snippet"]:
            lines.append(f"        {{ surfaceType: 'PDP', snippet: '{escape_ts(p['snippet'])}' }},")
        lines.append(f"      ],")
        if p["coverageStatus"] == "Not Covered":
            lines.append(f"      missingExplanation: 'Brand products not recommended by the AI assistant for this query.',")
        lines.append(f"    }},")
        lines.append(f"    lastTested: '{p['lastTested']}',")
        lines.append(f"    testRunCount: {p['testRunCount']},")
        lines.append(f"    stability: '{p['stability']}',")
        lines.append(f"    assistantSource: 'rufus',")
        lines.append("  },")
    lines.append("];")
    lines.append("")

    # Rollup metrics
    lines.append("export const mockRollupMetrics: RollupMetrics = {")
    lines.append(f"  overallVisibilityScore: {overall_vis},")
    lines.append(f"  overallCoveragePercentage: {coverage_pct},")
    lines.append(f"  trendDelta: -2,")
    lines.append("  visibilityTrend: [")
    # Simulated trend using available data
    lines.append("    { month: 'Sep', score: 28 },")
    lines.append("    { month: 'Oct', score: 25 },")
    lines.append("    { month: 'Nov', score: 23 },")
    lines.append("    { month: 'Dec', score: 22 },")
    lines.append("    { month: 'Jan', score: 23 },")
    lines.append(f"    {{ month: 'Feb', score: {overall_vis} }},")
    lines.append("  ],")
    lines.append("")

    # By journey stage
    lines.append("  byJourneyStage: {")
    for stage in ["Discovery", "Evaluation", "Conversion"]:
        sd = stage_data.get(stage, {"scores": [], "total": 0})
        avg = round(sum(sd["scores"]) / len(sd["scores"])) if sd["scores"] else 0
        above = sum(1 for s in sd["scores"] if s >= 50)
        pct = round(above / len(sd["scores"]) * 100) if sd["scores"] else 0
        total = sd["total"]
        lines.append(f"    {stage}: {{ label: '{stage}', value: {avg}, total: {total}, percentage: {pct} }},")
    lines.append("  },")
    lines.append("")

    # By priority
    lines.append("  byPriority: {")
    for pri in ["High", "Medium", "Low"]:
        pd2 = pri_data.get(pri, {"scores": [], "total": 0})
        avg = round(sum(pd2["scores"]) / len(pd2["scores"])) if pd2["scores"] else 0
        above = sum(1 for s in pd2["scores"] if s >= 50)
        pct = round(above / len(pd2["scores"]) * 100) if pd2["scores"] else 0
        total = pd2["total"]
        lines.append(f"    {pri}: {{ label: '{pri}', value: {avg}, total: {total}, percentage: {pct} }},")
    lines.append("  },")
    lines.append("")

    # By surface
    lines.append("  bySurface: [")
    total_p = len(all_prompts)
    for surf in ["PDP", "Brand Store", "Q&A", "Reviews"]:
        c = surface_counts.get(surf, 0)
        pct = round(c / total_p * 100, 1) if total_p else 0
        lines.append(f"    {{ surface: '{surf}', covered: {c}, total: {total_p}, percentage: {pct} }},")
    lines.append("  ],")
    lines.append("")

    lines.append("  coverageBreakdown: {")
    lines.append(f"    covered: {covered},")
    lines.append(f"    partial: {partial},")
    lines.append(f"    notCovered: {not_covered},")
    lines.append("  },")
    lines.append("};")
    lines.append("")

    # Top competitors
    lines.append("export const topCompetitors = [")
    for c in top_comps:
        lines.append(f"  {{ name: '{escape_ts(c['name'])}', mentions: {c['mentions']}, percentage: {c['percentage']} }},")
    lines.append("];")
    lines.append("")

    # Citation sources
    lines.append("export const topCitationSources = [")
    lines.append(f"  {{ name: 'Product Listings (PDP)', mentions: {asin_count}, percentage: {round(asin_count/total_cit*100) if total_cit else 0} }},")
    lines.append(f"  {{ name: 'AI Answer Content', mentions: {ans_count}, percentage: {round(ans_count/total_cit*100) if total_cit else 0} }},")
    lines.append(f"  {{ name: 'Follow-up Questions', mentions: {fq_count}, percentage: {round(fq_count/total_cit*100) if total_cit else 0} }},")
    lines.append("];")
    lines.append("")

    ts_content = "\n".join(lines)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(ts_content)

    print(f"\nWrote {len(lines)} lines to {output_path}")
    print(f"  {len(selected)} prompts selected (of {len(all_prompts)} total)")
    print(f"  {len(topic_prompts)} topics")
    print(f"  Overall visibility: {overall_vis}/100")
    print(f"  Coverage: {covered} covered, {partial} partial, {not_covered} not covered")


if __name__ == "__main__":
    run()
