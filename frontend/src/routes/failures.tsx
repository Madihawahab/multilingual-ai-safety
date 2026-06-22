import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Card, Pill } from "@/components/research-ui";
import { getFailures, LANGUAGES, MODELS, DOMAINS } from "@/lib/observatory-data";
import { ChevronDown, Search } from "lucide-react";

export const Route = createFileRoute("/failures")({
  head: () => ({
    meta: [
      { title: "Failure Explorer · MASO" },
      { name: "description", content: "Top reliability failures audited by independent judges." },
    ],
  }),
  component: FailuresPage,
});

function FailuresPage() {
  const all = useMemo(() => getFailures(), []);
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("all");
  const [model, setModel] = useState("all");
  const [risk, setRisk] = useState("all");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = all.filter((f) => {
    if (q && !f.question.toLowerCase().includes(q.toLowerCase())) return false;
    if (lang !== "all" && f.language !== lang) return false;
    if (model !== "all" && f.model !== model) return false;
    if (cat !== "all" && f.category !== cat) return false;
    if (risk !== "all" && f.riskLabel !== risk) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow="Failure Explorer"
        title="Top reliability failures, audited end-to-end"
        description="Every entry below was independently flagged by the judge ensemble. Search by topic, filter by language or model, and expand a card to read the full failure trace."
      />
      <section className="container-research">
        <Card className="p-5 mb-6">
          <div className="grid md:grid-cols-12 gap-3">
            <div className="md:col-span-5 flex items-center gap-2 border border-[color:var(--border)] rounded-md px-3 py-2 bg-[color:var(--surface)]">
              <Search className="w-4 h-4 text-[color:var(--muted-foreground)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search failure questions…"
                className="bg-transparent outline-none text-[13.5px] w-full"
              />
            </div>
            <Select label="Language" value={lang} onChange={setLang} options={["all", ...LANGUAGES.map((l) => l.name)]} className="md:col-span-2" />
            <Select label="Model" value={model} onChange={setModel} options={["all", ...MODELS]} className="md:col-span-2" />
            <Select label="Risk" value={risk} onChange={setRisk} options={["all", "Critical", "High", "Moderate"]} className="md:col-span-1.5" />
            <Select label="Category" value={cat} onChange={setCat} options={["all", ...DOMAINS]} className="md:col-span-1.5" />
          </div>
          <div className="mt-3 text-[12px] text-[color:var(--muted-foreground)]">
            Showing <span className="num text-[color:var(--foreground)] font-medium">{filtered.length}</span> of {all.length} flagged cases
          </div>
        </Card>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[color:var(--border)] [&::-webkit-scrollbar-thumb]:rounded-full">
          {filtered.slice(0, 40).map((f) => {
            const isOpen = open === f.id;
            return (
              <Card key={f.id} className="overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  className="w-full text-left p-5 flex items-start gap-5 hover:bg-[color:var(--surface-muted)]/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Pill tone={f.riskLabel === "Critical" ? "danger" : f.riskLabel === "High" ? "warning" : "neutral"}>
                        {f.riskLabel} risk
                      </Pill>
                      <Pill tone="accent">{f.language}</Pill>
                      <Pill>{f.category}</Pill>
                      <span className="text-[11.5px] text-[color:var(--muted-foreground)]">· {f.model}</span>
                    </div>
                    <div className="text-[14.5px] font-medium text-[color:var(--foreground)]">{f.question}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">Risk score</div>
                      <div className="num text-[20px] font-semibold text-[color:var(--danger)]">{f.risk.toFixed(0)}</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[color:var(--muted-foreground)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-[color:var(--border)] grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="eyebrow mb-2">Model response</div>
                      <p className="text-[13.5px] leading-relaxed text-[color:var(--foreground)]">{f.response}</p>
                    </div>
                    <div>
                      <div className="eyebrow mb-2">Judge explanation</div>
                      <p className="text-[13.5px] leading-relaxed text-[color:var(--muted-foreground)]">{f.judge}</p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)] font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-[color:var(--border)] rounded-md px-2.5 py-2 bg-[color:var(--surface)] text-[13px]"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o === "all" ? "All" : o}</option>
        ))}
      </select>
    </label>
  );
}
