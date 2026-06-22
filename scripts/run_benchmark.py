import json
import requests
from datetime import datetime
import time
import os

print("=" * 60)
print("🧪 MULTILINGUAL AI SAFETY BENCHMARK")
print("=" * 60)

# Create results folder if missing
os.makedirs("results", exist_ok=True)

# Load questions
try:
    with open("data/questions.json", "r", encoding="utf-8") as f:
        questions = json.load(f)

    # TESTING
    # questions = questions[:5]
    questions = questions[:50]
    print(f"✅ Loaded {len(questions)} questions")

except Exception as e:
    print(f"❌ Error loading questions: {e}")
    exit()

print("=" * 60)

results = []

total_tests = len(questions) * 4
completed = 0

languages = [
    "english",
    "hindi",
    "tamil",
    "vietnamese"
]

OUTPUT_FILE = "results/results.json"


def save_results():
    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            results,
            f,
            indent=2,
            ensure_ascii=False
        )


for i, question in enumerate(questions, start=1):

    q_id = question.get("q_id", f"Q{i:03d}")

    for language in languages:

        question_text = question.get(language, "")

        if not question_text:
            print(f"⚠️ {q_id} missing {language}")
            continue

        print(
            f"[{i}/{len(questions)}] "
            f"{q_id} "
            f"{language.upper()[:3]}...",
            end=" ",
            flush=True
        )

        try:

            success = False
            response = None

            # Retry up to 3 times
            for attempt in range(3):

                try:

                    response = requests.get(
                        "http://127.0.0.1:8000/analyze",
                        params={
                            "question": question_text,
                            "language": language,
                            "correct_answer": question.get(
                                "correct_answer",
                                ""
                            )
                        },
                        timeout=180
                    )

                    success = True
                    break

                except Exception as retry_error:

                    print(
                        f"\n   Retry {attempt + 1}/3..."
                    )

                    time.sleep(5)

            if not success:
                raise Exception(
                    "Request failed after 3 retries"
                )

            if response.status_code == 200:

                data = response.json()

                response_text = data.get(
                    "response",
                    ""
                )

                if not response_text.strip():
                    print(
                        "⚠️ Empty Response",
                        end=" "
                    )

                result = {
                    "q_id": q_id,

                    "language": language,

                    "model": data.get(
                        "model",
                        ""
                    ),

                    "question": question_text,

                    "correct_answer": question.get(
                        "correct_answer",
                        ""
                    ),

                    "response": response_text,

                    "response_length": len(
                        response_text
                    ),

                    "error": data.get(
                        "error",
                        ""
                    ),

                    "http_status": response.status_code,

                    "refused": data.get(
                        "refused",
                        False
                    ),

                    "difficulty": question.get(
                        "difficulty",
                        "unknown"
                    ),

                    "category": question.get(
                        "category",
                        "unknown"
                    ),

                    "topic": question.get(
                        "topic",
                        "unknown"
                    ),

                    "timestamp": datetime.now().isoformat()
                }

                results.append(result)

                completed += 1

                # Save after EVERY successful response
                save_results()

                print("✅")

            else:

                print(
                    f"❌ HTTP {response.status_code}"
                )

                results.append({
                    "q_id": q_id,
                    "language": language,
                    "question": question_text,
                    "response": "",
                    "error": f"HTTP {response.status_code}",
                    "timestamp": datetime.now().isoformat()
                })

                save_results()

        except Exception as e:

            print(
                f"❌ {str(e)[:50]}"
            )

            results.append({
                "q_id": q_id,
                "language": language,
                "question": question_text,
                "response": "",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })

            save_results()

        # Prevent hitting API too fast
        time.sleep(6)

print("=" * 60)

try:

    save_results()

    print("🎉 BENCHMARK COMPLETE")

    print(
        f"✅ Completed: {completed}/{total_tests}"
    )

    print(
        f"💾 Saved: {OUTPUT_FILE}"
    )

    successful = sum(
        1 for r in results
        if r.get("response", "").strip()
    )

    empty = sum(
        1 for r in results
        if not r.get("response", "").strip()
    )

    failed = sum(
        1 for r in results
        if r.get("error", "")
    )

    print(
        f"📊 Successful Responses: {successful}"
    )

    print(
        f"⚠️ Empty Responses: {empty}"
    )

    print(
        f"❌ Errors: {failed}"
    )

except Exception as e:

    print(
        f"❌ Error saving results: {e}"
    )

print("=" * 60)