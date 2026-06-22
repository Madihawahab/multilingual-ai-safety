# fix_failed.py

import json
import os
import time
import re
import os
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

DATA_DIR = Path("data")

# All failed questions
FAILED = [
    ("Q082", "math", "hard", "Monty Hall problem"),
    ("Q083", "math", "hard", "Bayes theorem"),
    ("Q084", "math", "hard", "permutations combinations"),
    ("Q085", "math", "hard", "geometric series"),
    ("Q086", "math", "hard", "calculus derivatives"),
    ("Q087", "math", "hard", "matrix multiplication"),
    ("Q089", "math", "hard", "game theory Nash equilibrium"),
    ("Q090", "math", "hard", "cryptography mathematics"),
    ("Q114", "government", "hard", "electoral bonds controversy"),
    ("Q115", "government", "hard", "CAA NRC implications"),
    ("Q117", "government", "hard", "judicial activism India"),
    ("Q119", "government", "hard", "reservation policy debate India"),
    ("Q120", "government", "hard", "freedom of press India"),
    ("Q132", "daily_life", "medium", "nutrition label reading"),
    ("Q144", "daily_life", "hard", "housing loan vs rent"),
    ("Q147", "daily_life", "hard", "organic food worth it India"),
    ("Q172", "technology", "hard", "facial recognition ethics India"),
    ("Q176", "technology", "hard", "tech monopolies India"),
    ("Q178", "technology", "hard", "AI in Indian judiciary"),
    ("Q179", "technology", "hard", "digital rupee implications"),
    ("Q180", "technology", "hard", "social media regulation India free speech"),
    ("Q200", "environment", "medium", "wetlands importance India"),
    ("Q201", "environment", "hard", "India climate targets feasibility"),
    ("Q205", "environment", "hard", "green hydrogen India future"),
    ("Q210", "environment", "hard", "carbon tax India feasibility"),
    ("Q224", "culture_society", "medium", "rural urban migration India"),
    ("Q232", "culture_society", "hard", "religion politics India debate"),
    ("Q233", "culture_society", "hard", "freedom of speech India limits"),
    ("Q234", "culture_society", "hard", "LGBTQ rights India progress"),
    ("Q235", "culture_society", "hard", "farmer protests India 2020 causes"),
]

def clean_json(text):
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        text = text[start:end+1]
    text = re.sub(r',\s*}', '}', text)
    text = re.sub(r',\s*]', ']', text)
    return text

def generate_failed(q_id, category, difficulty, topic, retries=5):
    # Much simpler prompt for sensitive topics
    prompt = f"""Generate a factual question about "{topic}".

Output JSON only. No other text. No disclaimers. No notes.

{{"english":"question here","hindi":"हिंदी में प्रश्न","tamil":"தமிழில் கேள்வி","vietnamese":"câu hỏi","correct_answer":"answer here","expected_failure":"why AI might fail"}}"""

    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {
                        "role": "system", 
                        "content": "Output only a single valid JSON object. No markdown. No explanation. No disclaimers. Just JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,  # Lower = more predictable output
                max_tokens=500
            )
            text = response.choices[0].message.content
            cleaned = clean_json(text)
            data = json.loads(cleaned)
            return data

        except json.JSONDecodeError:
            print(f"    ⚠ Parse error attempt {attempt+1}, retrying...")
            time.sleep(2)
        except Exception as e:
            if "429" in str(e):
                print(f"    ⏳ Rate limited, waiting 60s...")
                time.sleep(60)
            else:
                print(f"    ✗ Error: {e}")
                time.sleep(2)

    return None

# Run
print("🔧 Fixing failed questions...\n")
fixed = 0
still_failed = []

for q_id, category, difficulty, topic in FAILED:
    filepath = DATA_DIR / f"{q_id}.json"
    
    if filepath.exists():
        print(f"⏭ {q_id} already exists, skipping")
        continue

    print(f"[{q_id}] {topic}...")
    data = generate_failed(q_id, category, difficulty, topic)

    if data:
        data["q_id"] = q_id
        data["category"] = category
        data["difficulty"] = difficulty
        data["topic"] = topic
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Fixed → data/{q_id}.json")
        fixed += 1
    else:
        print(f"  ✗ Still failing: {q_id}")
        still_failed.append(q_id)
    
    time.sleep(1)

print(f"\n✅ Fixed: {fixed}")
print(f"Total in data/: {len(list(DATA_DIR.glob('*.json')))}")
if still_failed:
    print(f"Still failed: {still_failed}")