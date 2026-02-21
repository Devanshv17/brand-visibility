#!/usr/bin/env python3
"""Compute unique volumes for each mock prompt using the keyword estimator."""
import re, math

STOP = {'i','me','my','we','our','you','your','he','she','it','they','them','a','an','the','and','but','or','if','is','am','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','can','may','might','shall','to','of','in','for','on','with','at','by','from','as','into','about','between','through','up','out','down','that','this','these','those','what','which','who','when','where','how','why','not','no','so','than','too','very','just','also','more','most','other','some','such','own','same','all','each','every','both','few','many','much','any','im','tell','explain','recommend','suggest','please','help','want','need','looking','think','know','find','get','make','use','try','like','give','really','actually','still','well','good','great','right','thing','things','way','something','whether','one','two'}

KV = {
    'dog food':246000,'best dog food':90500,'dry dog food':40500,'wet dog food':33100,
    'dog treats':49500,'dog dental chews':14800,'dog breath treats':8100,'puppy food':40500,
    'senior dog food':12100,'grain free dog food':18100,'high protein dog food':12100,
    'canned dog food':22200,'pedigree dog food':22200,'pedigree treats':4400,
    'dentastix':18100,'greenies dog treats':14800,'blue buffalo':33100,
    'purina dog food':22200,'iams dog food':14800,'hills science diet':9900,
    'royal canin':27100,'cesar dog food':8100,'nutro dog food':6600,
    'merrick dog food':6600,'milk bone':9900,'whimzees':9900,
    'picky eater dog':5400,'picky dog food':3600,'multi dog household':1300,
    'new dog owner':4400,'new dog parent':2400,'dog bad breath':12100,
    'dog teeth cleaning':6600,'dog dental care':4400,'dog appetite':2900,
    'dog nutrition':3600,'dog food comparison':2400,'dog food review':4400,
    'dog food recommendation':3600,'buy dog food':3600,'cheap dog food':6600,
    'affordable dog food':2400,'premium dog food':4400,'organic dog food':6600,
    'natural dog treats':4400,'dog food topper':8100,'dog food mixer':3600,
    'bulk dog food':6600,'safe dog treats':2400,'small dog treats':3600,
    'large dog treats':2400,'daily dog treats':1600,'dog food variety pack':2900,
    'complete meal dog food':1900,'beef dog food':6600,'chicken dog food':5400,
    'lamb dog food':3600,
}

def estimate(q):
    t = re.sub(r"[^\w\s'-]", ' ', q.lower()).strip()
    words = [w for w in t.split() if w not in STOP and len(w) > 1]
    matched = []
    used = set()
    for i in range(len(words)-2):
        p = f"{words[i]} {words[i+1]} {words[i+2]}"
        if p in KV:
            matched.append(KV[p]); used |= {i,i+1,i+2}
    for i in range(len(words)-1):
        if i in used or i+1 in used: continue
        p = f"{words[i]} {words[i+1]}"
        if p in KV:
            matched.append(KV[p]); used |= {i,i+1}
    for i in range(len(words)):
        if i in used: continue
        if words[i] in KV:
            matched.append(KV[words[i]]); used.add(i)
    base = max(matched) if matched else 2400
    wc = len(q.split())
    decay = 1.0 if wc <= 8 else 1/(1+0.05*(wc-8))
    return max(50, round(base * 0.15 * decay))


with open('src/data/mockData.ts', 'r') as f:
    lines = f.readlines()

current_text = None
count = 0
vols = []

for i, line in enumerate(lines):
    m = re.search(r"text:\s*'(.+?)',\s*$", line)
    if m:
        current_text = m.group(1).replace("\\'", "'")
    vm = re.search(r'monthlyVolume:\s*(\d+)', line)
    if vm and current_text:
        vol = estimate(current_text)
        vols.append(vol)
        lines[i] = re.sub(r'monthlyVolume:\s*\d+', f'monthlyVolume: {vol}', line)
        count += 1
        if count <= 8:
            print(f'  {vol:>5} <- "{current_text[:55]}..."')
        current_text = None

with open('src/data/mockData.ts', 'w') as f:
    f.writelines(lines)

print(f'\nUpdated {count} prompts')
print(f'Range: {min(vols)} - {max(vols)}')
print(f'Unique: {len(set(vols))}/{len(vols)}')
