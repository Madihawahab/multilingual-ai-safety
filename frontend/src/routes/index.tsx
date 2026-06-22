import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, SectionTitle, StatCard, Pill } from "@/components/research-ui";
import { getSummary, MODELS } from "@/lib/observatory-data";
import { ArrowRight, Beaker } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Multilingual AI Safety Observatory" },
      {
        name: "description",
        content:
          "Evaluating reliability, hallucinations, and factual accuracy of large language models across languages.",
      },
    ],
  }),
  component: Overview,
});

function Overview() {
  const summary = getSummary();
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
        <div className="container-research pt-20 pb-16 grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <div className="eyebrow mb-4 flex items-center gap-2">
              <Beaker className="w-3.5 h-3.5" />
              Research Preview · Q2 2026
            </div>
            <h1 className="text-[44px] md:text-[58px] leading-[1.04] font-semibold tracking-tight">
              Multilingual <br />
              <span className="text-[color:var(--secondary)]">AI Safety Observatory</span>
            </h1>
            <p className="mt-6 text-[17px] leading-relaxed text-[color:var(--muted-foreground)] max-w-xl">
              Evaluating reliability, hallucinations, and factual accuracy across languages.
              English-only evaluations can hide critical reliability failures in other languages.
              This observatory measures cross-language safety gaps and reveals where models become
              less trustworthy.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/language-gap"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[color:var(--primary)] text-[color:var(--primary-foreground)] text-[14px] font-medium hover:bg-[color:var(--secondary)] transition-colors"
              >
                Explore Results <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/live"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] text-[14px] font-medium hover:border-[color:var(--secondary)] transition-colors"
              >
                Run Live Evaluation
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-[12.5px] text-[color:var(--muted-foreground)]">
              <span>· Dual-judge evaluation</span>
              <span>· Bootstrap 95% confidence intervals</span>
              <span>· Reproducible benchmark</span>
              <span>· CC-BY data release</span>
            </div>
          </div>

          {/* Thesis pull-quote card */}
          <div className="lg:col-span-5">
            <Card className="p-7">
              <div className="eyebrow mb-3">Core Thesis</div>
              <p className="text-[17px] leading-relaxed text-[color:var(--foreground)]">
                "AI systems often appear safe when evaluated only in English, but can become
                <span className="text-[color:var(--accent)] font-medium"> significantly less reliable </span>
                in other languages."
              </p>
              <div className="mt-6 pt-6 border-t border-[color:var(--border)] grid grid-cols-2 gap-4">
                <Metric label="Largest Reliability Gap" value={`+${summary.largestGap}`} tone="danger" />
                <Metric label="Average Reliability" value={`${summary.avgReliability}`} tone="accent" />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container-research pt-16">
        <SectionTitle eyebrow="Observatory at a glance" title="Six axes of measurement" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Models Tested" value={summary.modelsTested} />
          <StatCard label="Languages Tested" value={summary.languagesTested} />
          <StatCard label="Questions Evaluated" value={summary.questionsEvaluated.toLocaleString()} />
          <StatCard label="Total Evaluations" value={summary.totalEvaluations.toLocaleString()} />
          <StatCard label="Avg Reliability" value={summary.avgReliability} hint="0–100 score" />
          <StatCard label="Largest Gap" value={`+${summary.largestGap}`} hint="EN vs non-EN" />
        </div>
      </section>

      {/* Reliability gap chart */}
      <section className="container-research pt-20">
        <SectionTitle
          eyebrow="Cross-language reliability"
          title="English vs. non-English reliability by model"
          description="Bars compare each model's average reliability score on English prompts to the mean across all other languages. Larger bars indicate broader degradation outside English."
        />
        <Card className="p-6">
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.gaps}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                barGap={4}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="model"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  domain={[0, 100]}
                  label={{ value: "Reliability", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: 6,
                    color: "#f8fafc",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="english" name="English" fill="#0f172a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="nonEnglish" name="Non-English (avg)" fill="#0ea5a4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend />
        </Card>
      </section>

      {/* Gap finding cards */}
      <section className="container-research pt-20">
        <SectionTitle
          eyebrow="Per-model findings"
          title="Reliability gap with 95% confidence intervals"
          description="Every measured model exhibits a statistically significant reliability gap between English and non-English prompts."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.gaps.map((g) => (
            <Card key={g.model} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)] font-semibold">
                    Model
                  </div>
                  <div className="mt-1 text-[15px] font-semibold tracking-tight">{g.model}</div>
                </div>
                <Pill tone={g.gap > 15 ? "danger" : g.gap > 8 ? "warning" : "success"}>
                  Gap +{g.gap}
                </Pill>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">English</div>
                  <div className="num text-[20px] font-semibold mt-1">{g.english}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">Non-English</div>
                  <div className="num text-[20px] font-semibold mt-1">{g.nonEnglish}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[color:var(--border)] text-[12px] text-[color:var(--muted-foreground)] flex items-center justify-between">
                <span>95% CI [{g.ciLow}, {g.ciHigh}]</span>
                <span className="text-[color:var(--success)] font-medium">● Significant</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Methodology / pipeline */}
      <section className="container-research pt-24 pb-8">
        <details className="group bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl overflow-hidden">
          <summary className="cursor-pointer p-6 flex justify-between items-center font-semibold text-[18px] bg-[color:var(--surface-muted)] group-open:border-b border-[color:var(--border)]">
            Methodology
            <span className="text-[color:var(--muted-foreground)] group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-8 grid gap-10">
            {/* 1. Pipeline */}
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight mb-4 text-[color:var(--foreground)]">1. Evaluation Pipeline</h3>
              <div className="flex flex-wrap items-center gap-2">
                {[`Question Bank (${summary.questionsEvaluated} questions)`, `${summary.languagesTested} Languages`, `${summary.modelsTested} Models`, "LLM-as-Judge Scoring", "3 Failure Modes (Hallucination/Refusal/Factual Error)", "Safety Report"].map((s, i, arr) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="px-4 py-2.5 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[13px] font-medium text-[color:var(--foreground)] shadow-sm">
                      {s}
                    </div>
                    {i < arr.length - 1 && <span className="text-[color:var(--muted-foreground)]">→</span>}
                  </div>
                ))}
              </div>
            </div>



            <div className="grid md:grid-cols-2 gap-10">
              {/* 3. Scoring */}
              <div>
                <h3 className="text-[15px] font-semibold tracking-tight mb-4 text-[color:var(--foreground)]">3. Scoring Methodology</h3>
                <p className="text-[14px] leading-relaxed text-[color:var(--muted-foreground)]">
                  Each response is scored by an independent LLM judge on 3 dimensions: hallucination (0-100), refusal (0-100), factual error (0-100). Overall risk = average of three scores.
                </p>
              </div>

              {/* 4. Stats */}
              <div>
                <h3 className="text-[15px] font-semibold tracking-tight mb-4 text-[color:var(--foreground)]">4. Dataset Statistics</h3>
                <ul className="space-y-2 text-[14px] text-[color:var(--muted-foreground)]">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[color:var(--primary)]"></span> {summary.questionsEvaluated} questions across 8 domains</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[color:var(--primary)]"></span> 3 difficulty levels (easy/medium/hard)</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[color:var(--primary)]"></span> {summary.languagesTested} languages tested</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[color:var(--primary)]"></span> {summary.modelsTested} models evaluated</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[color:var(--primary)]"></span> ~{summary.totalEvaluations.toLocaleString()} total evaluations</li>
                </ul>
              </div>
            </div>
          </div>
        </details>
      </section>

      {/* Models tested */}
      <section className="container-research pt-12 pb-4">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-[15px] font-semibold tracking-tight">Models in this release</h3>
          <span className="text-[12px] text-[color:var(--muted-foreground)]">{MODELS.length} systems</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {MODELS.map((m) => (
            <span
              key={m}
              className="px-3 py-1.5 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] text-[12.5px] font-medium"
            >
              {m}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "danger" | "accent" }) {
  const color = tone === "danger" ? "text-[color:var(--danger)]" : "text-[color:var(--accent)]";
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)] font-semibold">
        {label}
      </div>
      <div className={`num mt-1 text-[26px] font-semibold tracking-tight ${color}`}>{value}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-5 pt-4 mt-2 text-[12px] text-[color:var(--muted-foreground)] border-t border-[color:var(--border)]">
      <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[color:var(--primary)]" /> English</span>
      <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[color:var(--accent)]" /> Non-English (mean)</span>
    </div>
  );
}

function Definition({ term, body }: { term: string; body: string }) {
  return (
    <div>
      <div className="text-[13px] font-semibold text-[color:var(--foreground)]">{term}</div>
      <p className="mt-1.5 text-[13px] text-[color:var(--muted-foreground)] leading-relaxed">{body}</p>
    </div>
  );
}

function Pipeline() {
  const steps = [
    "Question",
    "Target Model",
    "Response",
    "Judge Evaluation",
    "Reliability Score",
    "Dashboard Metrics",
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className="px-4 py-2.5 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[13px] font-medium">
            <span className="num text-[color:var(--muted-foreground)] mr-2 text-[11px]">
              {String(i + 1).padStart(2, "0")}
            </span>
            {s}
          </div>
          {i < steps.length - 1 && (
            <span className="text-[color:var(--muted-foreground)]">→</span>
          )}
        </div>
      ))}
    </div>
  );
}
