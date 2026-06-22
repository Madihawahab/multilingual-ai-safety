import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Card, Pill } from "@/components/research-ui";
import { Heatmap } from "@/components/Heatmap";
import { getLanguageMatrix, LANGUAGES, MODELS } from "@/lib/observatory-data";

export const Route = createFileRoute("/language-gap")({
  head: () => ({
    meta: [
      { title: "Language Gap Explorer · MASO" },
      { name: "description", content: "Cross-language model reliability heatmap." },
    ],
  }),
  component: LanguageGap,
});

function LanguageGap() {
  const all = useMemo(() => getLanguageMatrix(), []);
  const [sort, setSort] = useState<"model" | "reliability">("reliability");
  const [model, setModel] = useState<string>("all");

  const rows = useMemo(() => {
    const models = MODELS.filter((m) => model === "all" || m === model);
    const list = models.map((m) => {
      const cells = LANGUAGES.map((l) => {
        const c = all.find((x) => x.model === m && x.languageCode === l.code)!;
        return {
          col: l.name,
          value: c.reliability,
          tooltip: (
            <div className="space-y-1">
              <div className="font-semibold text-[12px]">{c.model} · {c.language}</div>
              <Row k="Reliability" v={c.reliability.toFixed(1)} />
              <Row k="Risk" v={c.risk.toFixed(1)} />
              <Row k="Samples" v={c.samples.toLocaleString()} />
              <Row k="95% CI" v={`[${c.ciLow}, ${c.ciHigh}]`} />
            </div>
          ),
        };
      });
      const avg = cells.reduce((s, x) => s + x.value, 0) / cells.length;
      return { label: m, cells, avg };
    });
    if (sort === "reliability") list.sort((a, b) => a.avg - b.avg);
    return list;
  }, [all, sort, model]);

  return (
    <>
      <PageHeader
        eyebrow="Language Gap Explorer"
        title="Where models become less reliable outside English"
        description="Each cell reports the model's mean reliability score on prompts in that language. Hover for sample counts and confidence intervals."
      />
      <section className="container-research">
        <Card className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 text-[13px]">
              <Field label="Sort by">
                <select
                  className="border border-[color:var(--border)] rounded-md px-2.5 py-1.5 bg-[color:var(--surface)]"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                >
                  <option value="reliability">Lowest reliability</option>
                  <option value="model">Model name</option>
                </select>
              </Field>
              <Field label="Filter model">
                <select
                  className="border border-[color:var(--border)] rounded-md px-2.5 py-1.5 bg-[color:var(--surface)]"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="all">All models</option>
                  {MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[color:var(--muted-foreground)]">
              <Pill tone="accent">{LANGUAGES.length} languages</Pill>
              <Pill>{rows.length} models</Pill>
            </div>
          </div>
          <Heatmap rows={rows} columns={LANGUAGES.map((l) => l.name)} />
        </Card>

        {/* Key findings */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Finding
            title="Largest absolute gap"
            body="Hindi responses show the steepest reliability drop across the cohort, averaging several points below English-language baselines."
          />
          <Finding
            title="Most consistent model"
            body="meta/llama-3.3-70b-instruct exhibits the smallest cross-language variance, though every measured model degrades in at least four languages."
          />
          <Finding
            title="High-stakes signal"
            body="Reliability falls significantly in non-English cells — a threshold the observatory treats as advisory-grade caution."
          />
        </div>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-[color:var(--muted-foreground)] uppercase tracking-[0.12em]">
      {label}
      {children}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[color:var(--muted-foreground)]">{k}</span>
      <span className="num">{v}</span>
    </div>
  );
}

function Finding({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-5">
      <div className="eyebrow mb-2">Key finding</div>
      <div className="text-[14px] font-semibold">{title}</div>
      <p className="mt-2 text-[13px] text-[color:var(--muted-foreground)] leading-relaxed">{body}</p>
    </Card>
  );
}
