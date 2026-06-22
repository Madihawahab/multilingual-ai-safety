import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Card, Pill } from "@/components/research-ui";
import { getBenchmark, LANGUAGES, MODELS, DOMAINS } from "@/lib/observatory-data";
import { Search } from "lucide-react";

export const Route = createFileRoute("/benchmarks")({
  head: () => ({
    meta: [
      { title: "Benchmark Explorer · MASO" },
      { name: "description", content: "Side-by-side multilingual model responses for every benchmark question." },
    ],
  }),
  component: BenchmarkPage,
});

function BenchmarkPage() {
  const all = useMemo(() => getBenchmark(), []);
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("all");
  const [cat, setCat] = useState("all");
  const [diff, setDiff] = useState("all");
  const [sel, setSel] = useState<string | null>(null);

  const filtered = all.filter((it) => {
    if (q && !it.question.toLowerCase().includes(q.toLowerCase())) return false;
    if (lang !== "all" && it.language !== lang) return false;
    if (cat !== "all" && it.category !== cat) return false;
    if (diff !== "all" && it.difficulty !== diff) return false;
    return true;
  });
  const selected = filtered.find((x) => x.id === sel) ?? filtered[0];

  return (
    <>
      <PageHeader
        eyebrow="Benchmark Explorer"
        title="Search the multilingual benchmark"
        description="Every question in the benchmark, side-by-side with reference answers and the full response from each evaluated model."
      />
      <section className="container-research grid lg:grid-cols-12 gap-6">
        {/* Left: list */}
        <div className="lg:col-span-5">
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-2 border border-[color:var(--border)] rounded-md px-3 py-2 bg-[color:var(--surface)] mb-3">
              <Search className="w-4 h-4 text-[color:var(--muted-foreground)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search questions…"
                className="bg-transparent outline-none text-[13.5px] w-full"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Mini label="Language" value={lang} onChange={setLang} options={["all", ...LANGUAGES.map((l) => l.name)]} />
              <Mini label="Category" value={cat} onChange={setCat} options={["all", ...DOMAINS]} />
              <Mini label="Difficulty" value={diff} onChange={setDiff} options={["all", "Easy", "Medium", "Hard"]} />
            </div>
          </Card>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[color:var(--border)] [&::-webkit-scrollbar-thumb]:rounded-full">
            {filtered.slice(0, 60).map((it) => {
              const active = selected?.id === it.id;
              return (
                <button
                  key={it.id}
                  onClick={() => setSel(it.id)}
                  className={[
                    "w-full text-left p-4 rounded-lg border transition-colors",
                    active
                      ? "border-[color:var(--foreground)] bg-[color:var(--surface)]"
                      : "border-[color:var(--border)] bg-[color:var(--card)] hover:border-[color:var(--secondary)]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Pill tone="accent">{it.language}</Pill>
                    <Pill>{it.category}</Pill>
                    <Pill tone={it.difficulty === "Hard" ? "warning" : "neutral"}>{it.difficulty}</Pill>
                  </div>
                  <div className="text-[13.5px] font-medium leading-snug">{it.question}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: detail */}
        <div className="lg:col-span-7">
          {selected && (
            <Card className="p-6">
              <div className="flex flex-wrap gap-2 mb-3">
                <Pill tone="accent">{selected.language}</Pill>
                <Pill>{selected.category}</Pill>
                <Pill tone={selected.difficulty === "Hard" ? "warning" : "neutral"}>{selected.difficulty}</Pill>
              </div>
              <h2 className="text-[20px] font-semibold tracking-tight leading-snug">{selected.question}</h2>
              <div className="mt-4 p-4 bg-[color:var(--surface-muted)] rounded-md text-[13px]">
                <div className="eyebrow mb-1">Reference answer</div>
                {selected.correct}
              </div>

              <div className="mt-6">
                <div className="eyebrow mb-3">Model responses ({selected.responses.length})</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {selected.responses.map((r) => (
                    <div key={r.model} className="border border-[color:var(--border)] rounded-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-[13.5px]">{r.model}</div>
                        <Pill tone={r.reliability >= 80 ? "success" : r.reliability >= 60 ? "warning" : "danger"}>
                          {r.reliability.toFixed(0)} reliability
                        </Pill>
                      </div>
                      <p className="text-[13px] text-[color:var(--muted-foreground)] leading-relaxed">{r.response}</p>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center pt-3 border-t border-[color:var(--border)]">
                        <ScoreMini label="Halluc." v={r.hallucination} />
                        <ScoreMini label="Refusal" v={r.refusal} />
                        <ScoreMini label="Fact. err" v={r.factualError} />
                        <ScoreMini label="Risk" v={r.risk} danger />
                      </div>
                      <div className="mt-3 text-[11.5px] text-[color:var(--muted-foreground)] leading-relaxed">
                        <span className="font-semibold text-[color:var(--foreground)]">Judge: </span>
                        {r.judge}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}

function Mini({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)] font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-[color:var(--border)] rounded-md px-2 py-1.5 bg-[color:var(--surface)] text-[12.5px]"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o === "all" ? "All" : o}</option>
        ))}
      </select>
    </label>
  );
}

function ScoreMini({ label, v, danger }: { label: string; v: number; danger?: boolean }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--muted-foreground)]">{label}</div>
      <div className={`num text-[14px] font-semibold ${danger ? "text-[color:var(--danger)]" : "text-[color:var(--foreground)]"}`}>
        {v.toFixed(0)}
      </div>
    </div>
  );
}
