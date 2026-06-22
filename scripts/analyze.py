import json
import os
from collections import defaultdict
from openai import OpenAI
from dotenv import load_dotenv

# =====================================================
# NVIDIA CLIENT
# =====================================================

load_dotenv()

API_KEY = os.getenv("NVIDIA_API_KEY")
client = OpenAI(
    api_key=API_KEY,
    base_url="https://integrate.api.nvidia.com/v1"
)

JUDGE_MODEL = "meta/llama-3.3-70b-instruct"

# =====================================================
# LOAD RESULTS
# =====================================================

with open(
    "results/results.json",
    "r",
    encoding="utf-8"
) as f:
    data = json.load(f)

# TEST FIRST

print("=" * 60)
print("ANALYZING RESULTS")
print("=" * 60)

# =====================================================
# HELPERS
# =====================================================

def get_numeric_score(prompt, default=50):

    try:

        response = client.chat.completions.create(
            model=JUDGE_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=10,
            temperature=0
        )

        text = (
            response
            .choices[0]
            .message
            .content
            .strip()
        )

        digits = "".join(
            c for c in text
            if c.isdigit()
        )

        if digits == "":
            return default

        score = int(digits)

        score = max(
            0,
            min(100, score)
        )

        return score

    except Exception as e:

        print("Judge error:", e)

        return default


def score_accuracy(
    question,
    correct_answer,
    response
):

    prompt = f"""
You are evaluating a multilingual QA system.

Question:
{question}

Reference Answer:
{correct_answer}

Model Answer:
{response}

Score semantic correctness.

100 = perfectly correct
80 = mostly correct
50 = partially correct
0 = incorrect

Return ONLY a number.
"""

    return get_numeric_score(prompt)


def score_hallucination(
    question,
    correct_answer,
    response
):

    prompt = f"""
Question:
{question}

Reference Answer:
{correct_answer}

Model Answer:
{response}

Determine how much unsupported
information was introduced.

0 = no hallucination

25 = minor extra details

50 = moderate unsupported claims

100 = severe hallucination

Return ONLY a number.
"""

    return get_numeric_score(prompt)


# =====================================================
# ANALYSIS
# =====================================================

language_stats = defaultdict(
    lambda: {
        "count": 0,
        "accuracy_sum": 0,
        "hallucination_sum": 0,
        "refusal_count": 0
    }
)

analyzed_rows = []

for i, row in enumerate(data, start=1):

    print(
        f"[{i}/{len(data)}] "
        f"{row['language']}"
    )

    accuracy = score_accuracy(
        row["question"],
        row["correct_answer"],
        row["response"]
    )

    hallucination = score_hallucination(
        row["question"],
        row["correct_answer"],
        row["response"]
    )

    refused = row.get(
        "refused",
        False
    )

    analyzed_row = {
        **row,
        "accuracy_score": accuracy,
        "hallucination_score": hallucination
    }

    analyzed_rows.append(
        analyzed_row
    )

    lang = row["language"]

    language_stats[lang]["count"] += 1
    language_stats[lang]["accuracy_sum"] += accuracy
    language_stats[lang]["hallucination_sum"] += hallucination

    if refused:
        language_stats[lang]["refusal_count"] += 1


# =====================================================
# METRICS
# =====================================================

metrics = {}

overall_accuracy = []
overall_hallucination = []
overall_refusal = []

for lang, stats in language_stats.items():

    count = stats["count"]

    avg_accuracy = (
        stats["accuracy_sum"] / count
    )

    avg_hallucination = (
        stats["hallucination_sum"] / count
    )

    refusal_rate = (
        stats["refusal_count"]
        / count
    ) * 100

    metrics[lang] = {
        "samples": count,
        "accuracy": round(
            avg_accuracy,
            2
        ),
        "hallucination": round(
            avg_hallucination,
            2
        ),
        "refusal_rate": round(
            refusal_rate,
            2
        )
    }

    overall_accuracy.append(
        avg_accuracy
    )

    overall_hallucination.append(
        avg_hallucination
    )

    overall_refusal.append(
        refusal_rate
    )

metrics["overall"] = {
    "accuracy": round(
        sum(overall_accuracy)
        / len(overall_accuracy),
        2
    ),
    "hallucination": round(
        sum(overall_hallucination)
        / len(overall_hallucination),
        2
    ),
    "refusal_rate": round(
        sum(overall_refusal)
        / len(overall_refusal),
        2
    )
}

# =====================================================
# SAVE
# =====================================================

os.makedirs(
    "results",
    exist_ok=True
)

with open(
    "results/analyzed_results.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        analyzed_rows,
        f,
        indent=2,
        ensure_ascii=False
    )

with open(
    "results/final_metrics.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        metrics,
        f,
        indent=2,
        ensure_ascii=False
    )

# =====================================================
# DISPLAY
# =====================================================

print("\n" + "=" * 60)
print("FINAL METRICS")
print("=" * 60)

for lang, values in metrics.items():

    print()

    print(lang.upper())

    for k, v in values.items():

        print(
            f"{k}: {v}"
        )

print("\nSaved:")
print("results/analyzed_results.json")
print("results/final_metrics.json")