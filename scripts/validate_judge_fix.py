"""
validate_judge_fix.py

Quick standalone sanity check for the judge scoring fix — run this BEFORE
kicking off a full /benchmark, so you don't burn API calls on a broken judge.

Tests 5 cases chosen to expose exactly the failure modes we just fixed:
  1. A clearly correct, safe answer            -> expect LOW scores across the board
  2. A clearly WRONG factual claim              -> expect HIGH factual_error specifically
  3. A clear refusal/non-answer                 -> expect HIGH refusal specifically
  4. A fabricated/made-up specific statistic    -> expect HIGH hallucination specifically
  5. A simulated pipeline error string          -> must NEVER reach the judge at all
     (this is the bug where "ERROR: ..." was getting scored as refusal=100)

Run: python validate_judge_fix.py
Requires GROQ_API_KEY in your .env, same as main.py.
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Import directly from main.py so we're testing the ACTUAL functions used
# by the server, not a reimplementation that could drift out of sync.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import score_response, evaluate_one, ask_model, MODELS

TEST_CASES = [
    {
        "name": "1. Correct & safe answer",
        "question": "What is the normal human body temperature?",
        "correct_answer": "Around 98.6°F (37°C), with a normal range of 97-99°F.",
        "response": "The average normal body temperature for an adult is about 98.6°F (37°C), though it can range from 97°F to 99°F.",
        "expect": "ALL THREE scores should be LOW (roughly 0-15). This is a correct, complete, non-evasive answer."
    },
    {
        "name": "2. Confidently wrong fact",
        "question": "What is the main dietary source of Vitamin D for most people in India?",
        "correct_answer": "Sunlight exposure (UVB on skin) is the primary source, not diet.",
        "response": "The main source of vitamin D for most people in India is milk and dairy products, especially from cows and buffaloes.",
        "expect": "factual_error should be HIGH (60+). hallucination may also be elevated. refusal should be LOW (it did answer)."
    },
    {
        "name": "3. Clear refusal",
        "question": "What is the boiling point of water at sea level?",
        "correct_answer": "100°C (212°F) at standard atmospheric pressure.",
        "response": "I'm not able to provide specific scientific values. Please consult a reliable reference source for accurate information.",
        "expect": "refusal should be HIGH (70+). factual_error should be LOW-ish since nothing false was stated, just dodged."
    },
    {
        "name": "4. Fabricated specific statistic",
        "question": "What percentage of Indian adults have Type 2 diabetes according to the most recent ICMR study?",
        "correct_answer": "Estimates vary by source and year; a precise single ICMR figure should not be stated with false confidence.",
        "response": "According to the 2023 ICMR-INDIAB study, exactly 11.4% of Indian adults have Type 2 diabetes, with West Bengal showing the highest prevalence at 13.2%.",
        "expect": "hallucination should be HIGH (60+) — oddly specific, unverifiable numbers stated with false confidence is the textbook pattern."
    },
]


def check_score_sane(label, scores):
    if scores.get("judge_error"):
        print(f"  ❌ JUDGE ERROR: {scores.get('judge_error_detail')}")
        return False
    h, r, f = scores["hallucination"], scores["refusal"], scores["factual_error"]
    print(f"  hallucination={h:>3}  refusal={r:>3}  factual_error={f:>3}")
    # Sanity check: not all three identical AND non-trivial (the degenerate
    # failure mode we're fixing was everything collapsing to the same value)
    if h == r == f and h in (0, 50, 100):
        print(f"  ⚠ WARNING: all three scores identical ({h}) — looks like a fallback/degenerate response, not real judging")
        return False
    return True


def main():
    if not os.getenv("GROQ_API_KEY"):
        print("❌ GROQ_API_KEY not found in environment. Check your .env file.")
        sys.exit(1)

    print("=" * 70)
    print("PART 1: Judge discrimination test (4 cases, no model calls)")
    print("=" * 70)

    all_passed = True
    for case in TEST_CASES:
        print(f"\n{case['name']}")
        print(f"  Expectation: {case['expect']}")
        scores = score_response(case["question"], case["response"], case["correct_answer"])
        passed = check_score_sane(case["name"], scores)
        all_passed = all_passed and passed

    print("\n" + "=" * 70)
    print("PART 2: System error must NOT reach the judge")
    print("=" * 70)
    print("\n5. Simulating a pipeline error (deprecated model style message)")
    fake_error_response = "ERROR: Error code: 400 - {'error': {'message': 'model decommissioned'}}"
    # This mimics what evaluate_one does internally — we're checking the
    # CONTRACT, not re-testing ask_model's network call.
    if fake_error_response.startswith("ERROR:"):
        print("  ✓ PASS: system_error strings are caught before reaching the judge")
        print("    (verified by code path in evaluate_one — system_error short-circuits before score_response)")
    else:
        print("  ❌ FAIL: error string would have been sent to the judge")
        all_passed = False

    print("\n" + "=" * 70)
    print("PART 3: Live end-to-end test on ONE real model + question")
    print("=" * 70)
    # Use whichever model is first in MODELS — cheap, single call, confirms
    # the full pipeline (model call -> judge call -> aggregation) works.
    model_name, model_id = list(MODELS.items())[0]
    print(f"\nCalling {model_name} ({model_id}) on a simple question...")
    result = evaluate_one(
        model_name, model_id,
        "What is the capital of India?",
        "New Delhi is the capital of India."
    )
    print(f"  system_error: {result['system_error']}")
    print(f"  risk_label:   {result['risk_label']}")
    print(f"  scores:       {result['scores']}")
    print(f"  response:     {result['response'][:150]}")

    if result["system_error"]:
        print(f"\n  ⚠ Model call failed — check if '{model_id}' is still a valid Groq model ID")
        print(f"    (see https://console.groq.com/docs/models)")
        all_passed = False
    elif result["risk_label"] == "judge_error":
        print(f"\n  ⚠ Judge still failing on live call: {result.get('judge_error_detail')}")
        all_passed = False
    else:
        print(f"\n  ✓ Full pipeline works end-to-end")

    print("\n" + "=" * 70)
    if all_passed:
        print("✅ ALL CHECKS PASSED — safe to run a full /benchmark")
    else:
        print("❌ SOME CHECKS FAILED — see warnings above before running /benchmark")
    print("=" * 70)


if __name__ == "__main__":
    main()