"""
aggregate_results.py

Reads benchmark_results.json and produces summary stats for the dashboard:
- per (model, language) average risk scores, with N and excluded-error counts
- the core "reliability gap" metric: risk(non-English) - risk(English), per model
- per-category breakdown

CRITICAL: system_error and judge_error data points are EXCLUDED from
averages, not zero-filled. A model that errored on every Tamil question
should show as "insufficient data", not as "perfectly safe" (which is what
silently treating None as 0 would imply).

Run after /benchmark: python aggregate_results.py
"""

import json
import random
import statistics
from collections import defaultdict
from pathlib import Path

RESULTS_FILE = Path("benchmark_results.json")

# Fixed seed so re-running on the same data gives the same CI every time —
# important for a hackathon demo where you don't want numbers shifting
# between your slides and a live re-run.
random.seed(42)
N_BOOTSTRAP = 2000


def load_results():
    with open(RESULTS_FILE, encoding="utf-8") as f:
        return json.load(f)


def aggregate(results):
    # cell = (model, language) -> list of overall_risk values (errors excluded)
    cells = defaultdict(list)
    error_counts = defaultdict(lambda: {"system_error": 0, "judge_error": 0, "ok": 0})

    # also track per category for the heatmap drill-down
    category_cells = defaultdict(list)  # (model, language, category) -> [risk,...]

    failures = []

    for q in results:
        category = q["category"]
        for lang, model_results in q["languages"].items():
            for model_name, r in model_results.items():
                key = (model_name, lang)
                if r.get("system_error"):
                    error_counts[key]["system_error"] += 1
                    continue
                if r.get("risk_label") == "judge_error":
                    error_counts[key]["judge_error"] += 1
                    continue
                if r.get("overall_risk") is not None:
                    cells[key].append(r["overall_risk"])
                    category_cells[(model_name, lang, category)].append(r["overall_risk"])
                    error_counts[key]["ok"] += 1
                    if r["overall_risk"] > 0:
                        failures.append({
                            "question": q.get(lang, q.get("english", "")),
                            "language": lang,
                            "model": model_name,
                            "response": r.get("response", ""),
                            "risk": r["overall_risk"]
                        })

    failures.sort(key=lambda x: x["risk"], reverse=True)
    top_failures = failures[:50]

    category_summary = []
    for key, values in category_cells.items():
        model_name, lang, category = key
        n = len(values)
        if n > 0:
            avg = sum(values) / n
            category_summary.append({
                "model": model_name,
                "language": lang,
                "category": category,
                "avg_risk": round(avg, 1)
            })

    summary = []
    for key, values in cells.items():
        model_name, lang = key
        n = len(values)
        avg = sum(values) / n if n else None
        sd = statistics.stdev(values) if n >= 2 else None
        
        if n >= 2:
            boot_means = []
            for _ in range(1000):
                sample = [random.choice(values) for _ in values]
                boot_means.append(sum(sample) / n)
            boot_means.sort()
            ci_low = round(boot_means[int(0.025 * 1000)], 1)
            ci_high = round(boot_means[int(0.975 * 1000)], 1)
        else:
            ci_low, ci_high = None, None

        summary.append({
            "model": model_name,
            "language": lang,
            "avg_overall_risk": round(avg, 1) if avg is not None else None,
            "avg_reliability": round(100 - avg, 1) if avg is not None else None,
            "stdev_overall_risk": round(sd, 1) if sd is not None else None,
            "risk_ci_95_low": ci_low,
            "risk_ci_95_high": ci_high,
            "n_scored": n,
            "n_system_error": error_counts[key]["system_error"],
            "n_judge_error": error_counts[key]["judge_error"],
        })

    return summary, category_summary, top_failures, cells


def bootstrap_gap_ci(english_values, non_english_values, n_bootstrap=N_BOOTSTRAP, ci=0.95):
    """
    Bootstrap 95% CI for (mean(non_english) - mean(english)).
    Resamples each group with replacement n_bootstrap times, computes the
    gap each time, and takes the percentile interval. This is the standard
    non-parametric way to get a CI on a difference of means without
    assuming normality — appropriate here since risk scores are bounded
    0-100 and often skewed toward 0 (most answers are fine; failures are
    the tail).
    """
    if len(english_values) < 2 or len(non_english_values) < 2:
        return None, None

    boot_gaps = []
    for _ in range(n_bootstrap):
        eng_sample = [random.choice(english_values) for _ in english_values]
        non_eng_sample = [random.choice(non_english_values) for _ in non_english_values]
        boot_gaps.append(statistics.mean(non_eng_sample) - statistics.mean(eng_sample))

    boot_gaps.sort()
    alpha = (1 - ci) / 2
    lo_idx = int(alpha * n_bootstrap)
    hi_idx = int((1 - alpha) * n_bootstrap) - 1
    return round(boot_gaps[lo_idx], 1), round(boot_gaps[hi_idx], 1)


def reliability_gap(summary, cells):
    """
    Core thesis metric: for each model, risk(non-English avg) - risk(English).
    Positive = model is LESS reliable in non-English languages (supports thesis).
    Requires both English and at least one other language to have enough data.

    Now also computes a bootstrap 95% CI on the gap. If the CI excludes 0,
    the gap is "significant" in the loose sense that it's unlikely to be
    pure noise at this sample size — report this honestly, including when
    it DOESN'T exclude 0 (e.g. small pilot runs), rather than only
    reporting CIs that look good.
    """
    by_model = defaultdict(dict)
    for row in summary:
        by_model[row["model"]][row["language"]] = row

    gaps = []
    for model, langs in by_model.items():
        eng = langs.get("english")
        if not eng or eng["avg_overall_risk"] is None or eng["n_scored"] < 3:
            continue

        non_eng_langs = [k for k in langs if k != "english" and langs[k]["avg_overall_risk"] is not None and langs[k]["n_scored"] >= 3]
        if not non_eng_langs:
            continue

        non_eng = [langs[l] for l in non_eng_langs]
        non_eng_avg = sum(v["avg_overall_risk"] for v in non_eng) / len(non_eng)

        # Pool raw per-question values across all non-English languages for
        # the bootstrap (treats each scored question as one observation).
        eng_values = cells[(model, "english")]
        pooled_non_eng_values = []
        for lang in non_eng_langs:
            pooled_non_eng_values.extend(cells[(model, lang)])

        ci_lo, ci_hi = bootstrap_gap_ci(eng_values, pooled_non_eng_values)
        gap = round(non_eng_avg - eng["avg_overall_risk"], 1)
        significant = (ci_lo is not None) and (ci_lo > 0 or ci_hi < 0)

        gaps.append({
            "model": model,
            "english_risk": eng["avg_overall_risk"],
            "english_n": eng["n_scored"],
            "non_english_avg_risk": round(non_eng_avg, 1),
            "non_english_n": len(pooled_non_eng_values),
            "gap": gap,
            "gap_ci_95_low": ci_lo,
            "gap_ci_95_high": ci_hi,
            "significant_at_95": significant,
            "languages_included": non_eng_langs,
            "min_n_per_language": min([eng["n_scored"]] + [langs[l]["n_scored"] for l in non_eng_langs])
        })

    return sorted(gaps, key=lambda g: -g["gap"])


if __name__ == "__main__":
    if not RESULTS_FILE.exists():
        print(f"No {RESULTS_FILE} found — run /benchmark first.")
        raise SystemExit(1)

    results = load_results()
    summary, category_summary, top_failures, cells = aggregate(results)
    gaps = reliability_gap(summary, cells)

    print("\n=== Per (model, language) summary ===")
    for row in sorted(summary, key=lambda r: (r["model"], r["language"])):
        flag = ""
        if row["n_system_error"] or row["n_judge_error"]:
            flag = f"  [excluded: {row['n_system_error']} system_error, {row['n_judge_error']} judge_error]"
        sd = f"±{row['stdev_overall_risk']}" if row["stdev_overall_risk"] is not None else ""
        print(f"  {row['model']:18s} {row['language']:12s} risk={row['avg_overall_risk']!s:>6}{sd:>7} n={row['n_scored']:3d}{flag}")

    print("\n=== Reliability gap (non-English risk - English risk) ===")
    print("  Positive = supports thesis (worse in non-English)")
    print("  95% CI computed via bootstrap (2000 resamples, seed=42)\n")
    for g in gaps:
        sig = "significant" if g["significant_at_95"] else "NOT significant"
        ci_str = f"[{g['gap_ci_95_low']}, {g['gap_ci_95_high']}]" if g["gap_ci_95_low"] is not None else "[insufficient data]"
        print(f"  {g['model']:18s} gap={g['gap']:+6.1f}  95% CI={ci_str:18s} {sig}")
        print(f"  {'':18s} (en={g['english_risk']} n={g['english_n']}, non-en={g['non_english_avg_risk']} n={g['non_english_n']})")

    rankings = defaultdict(list)
    for row in summary:
        if row["avg_reliability"] is not None:
            rankings[row["language"]].append({
                "model": row["model"],
                "reliability": row["avg_reliability"]
            })
    for lang in rankings:
        rankings[lang].sort(key=lambda x: -x["reliability"])

    with open("aggregate_summary.json", "w", encoding="utf-8") as f:
        json.dump({
            "language_heatmaps": summary,
            "category_heatmaps": category_summary,
            "failure_explorer": top_failures,
            "reliability_rankings": rankings,
            "reliability_gap": gaps
        }, f, ensure_ascii=False, indent=2)
    print("\nSaved aggregate_summary.json")