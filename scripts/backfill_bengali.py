"""
backfill_bengali.py

Adds a "bengali" field to your EXISTING question files in data/*.json
without touching any other field (english, hindi, tamil, vietnamese,
correct_answer, expected_failure, q_id, category, difficulty, topic
are all left exactly as they are).

Safe to run multiple times — skips any file that already has "bengali".
Safe to interrupt — already-written files are saved immediately, so a
Ctrl+C only loses the one in-flight question, not your whole dataset.

Run: python backfill_bengali.py
"""

import json
import os
import re
import time
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

DATA_DIR = Path("data")


def clean_json(text):
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        text = text[start:end + 1]
    text = re.sub(r',\s*}', '}', text)
    text = re.sub(r',\s*]', ']', text)
    return text


def translate_to_bengali(english_question: str, retries: int = 3) -> str | None:
    """
    Translates an existing English question into natural Bengali.
    Uses the SAME English question already in your dataset, so the
    question content stays identical across languages — only the
    surface language changes, which is exactly what you want for a
    controlled cross-language comparison.
    """
    prompt = f"""Translate this question into natural, spoken Bengali (as used in West Bengal/Bangladesh), not a literal/machine translation.

English question: "{english_question}"

Return ONLY a JSON object with one field, nothing else, no markdown:
{{"bengali": "the Bengali translation here"}}"""

    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a JSON generator. Output only valid JSON, no markdown, no explanation."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=300
            )
            text = response.choices[0].message.content
            cleaned = clean_json(text)
            data = json.loads(cleaned)
            bengali = data.get("bengali", "").strip()
            if bengali:
                return bengali
        except json.JSONDecodeError as e:
            print(f"    ⚠ parse error attempt {attempt+1}: {e}")
            time.sleep(2)
        except Exception as e:
            print(f"    ✗ attempt {attempt+1} failed: {e}")
            time.sleep(3)

    return None


def main():
    if not os.getenv("GROQ_API_KEY"):
        print("❌ GROQ_API_KEY not found in .env")
        return

    files = sorted(DATA_DIR.glob("*.json"))
    print(f"Found {len(files)} question files in {DATA_DIR.absolute()}\n")

    updated = 0
    skipped = 0
    failed = []

    for qfile in files:
        with open(qfile, encoding="utf-8") as f:
            q = json.load(f)

        if q.get("bengali"):
            skipped += 1
            continue

        english = q.get("english", "")
        if not english:
            print(f"  ⚠ {qfile.name}: no english field, skipping")
            failed.append(qfile.name)
            continue

        print(f"  [{q.get('q_id', qfile.stem)}] translating to Bengali...")
        bengali = translate_to_bengali(english)

        if bengali:
            q["bengali"] = bengali
            with open(qfile, "w", encoding="utf-8") as f:
                json.dump(q, f, ensure_ascii=False, indent=2)
            print(f"    ✓ saved")
            updated += 1
        else:
            print(f"    ✗ failed after retries")
            failed.append(qfile.name)

        time.sleep(1)  # gentle on rate limits

    print(f"\n✅ Done!")
    print(f"  Updated : {updated}")
    print(f"  Skipped : {skipped} (already had bengali)")
    print(f"  Failed  : {len(failed)}")
    if failed:
        print(f"\n⚠ Failed files (re-run this script to retry just these):")
        for name in failed:
            print(f"  {name}")


if __name__ == "__main__":
    main()