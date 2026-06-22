import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Card, Pill } from "@/components/research-ui";
import { Heatmap } from "@/components/Heatmap";
import { getDomainMatrix, getBenchmark, DOMAINS, LANGUAGES, MODELS } from "@/lib/observatory-data";

export const Route = createFileRoute("/domains")({
  head: () => ({
    meta: [
      { title: "Domain Analysis · MASO" },
      { name: "description", content: "Reliability by knowledge domain across languages." },
    ],
  }),
  component: DomainPage,
});

function DomainPage() {
  const [model, setModel] = useState<string>("all");
  
  const matrix = useMemo(() => getDomainMatrix(model === "all" ? undefined : model), [model]);
  const benchmarks = useMemo(() => getBenchmark(), []);

  const rows = DOMAINS.map((d) => {
    const cells = LANGUAGES.map((l) => {
      const c = matrix.find((x) => x.domain === d && x.languageCode === l.code)!;
      return {
        col: l.name,
        value: c.reliability,
        tooltip: (
          <div className="space-y-1">
            <div className="font-semibold text-[12px]">{d} · {l.name}</div>
            <div className="flex justify-between gap-4">
              <span className="text-[color:var(--muted-foreground)]">Reliability</span>
              <span className="num">{c.reliability.toFixed(1)}</span>
            </div>
          </div>
        ),
      };
    });
    const avg = cells.reduce((s, x) => s + x.value, 0) / cells.length;
    return { label: d, cells, avg };
  });

  const sortedByAvg = [...rows].sort((a, b) => b.avg - a.avg);
  const strongest = sortedByAvg[0];
  const weakest = sortedByAvg[sortedByAvg.length - 1];

  const RADAR_LANGUAGES = [
    { name: "English", color: "#14b8a6" },
    { name: "Hindi", color: "#ff7f50" },
    { name: "Tamil", color: "#a855f7" },
    { name: "Vietnamese", color: "#eab308" },
    { name: "Bengali", color: "#3b82f6" }
  ];

  const fingerprintData = useMemo(() => {
    return MODELS.map((m) => {
      const stats: Record<string, { hal: number; ref: number; fact: number; count: number }> = {};
      RADAR_LANGUAGES.forEach(l => {
        stats[l.name] = { hal: 0, ref: 0, fact: 0, count: 0 };
      });

      for (const q of benchmarks) {
        if (stats[q.language]) {
          const r = q.responses.find(x => x.model === m);
          if (r) {
            stats[q.language].hal += r.hallucination;
            stats[q.language].ref += r.refusal;
            stats[q.language].fact += r.factualError;
            stats[q.language].count++;
          }
        }
      }

      const dataObj: any = {
        'Hallucination rate': { subject: 'Hallucination rate', fullMark: 100 },
        'Refusal rate': { subject: 'Refusal rate', fullMark: 100 },
        'Factual error rate': { subject: 'Factual error rate', fullMark: 100 }
      };

      let enAvg = 0;
      let nonEnAvg = 0;
      let nonEnLangs = 0;

      RADAR_LANGUAGES.forEach(l => {
        const s = stats[l.name];
        const hal = s.count > 0 ? Math.round(s.hal / s.count) : 0;
        const ref = s.count > 0 ? Math.round(s.ref / s.count) : 0;
        const fact = s.count > 0 ? Math.round(s.fact / s.count) : 0;
        
        dataObj['Hallucination rate'][l.name] = hal;
        dataObj['Refusal rate'][l.name] = ref;
        dataObj['Factual error rate'][l.name] = fact;

        const avg = (hal + ref + fact) / 3;
        if (l.name === "English") {
          enAvg = avg;
        } else {
          nonEnAvg += avg;
          nonEnLangs++;
        }
      });

      nonEnAvg = nonEnLangs > 0 ? nonEnAvg / nonEnLangs : 0;
      const avgDiff = Math.round(nonEnAvg - enAvg);

      return { 
        model: m, 
        data: Object.values(dataObj), 
        avgDiff 
      };
    });
  }, [benchmarks]);

  return (
    <>
      <PageHeader
        eyebrow="Domain Analysis"
        title="Reliability by knowledge domain"
        description="Mean reliability by domain and language. Domains where the observatory has prioritized public-interest evaluation: health, government, science, and education."
      />
      <section className="container-research">
        <Card className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <label className="flex items-center gap-2 text-[12px] text-[color:var(--muted-foreground)] uppercase tracking-[0.12em]">
              Model
              <select
                className="border border-[color:var(--border)] rounded-md px-2.5 py-1.5 bg-[color:var(--surface)] text-[13px]"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="all">All models (averaged)</option>
                {MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Pill>{DOMAINS.length} domains</Pill>
              <Pill tone="accent">{LANGUAGES.length} languages</Pill>
            </div>
          </div>
          <Heatmap rows={rows} columns={LANGUAGES.map((l) => l.name)} rowLabel="Domain" />
        </Card>

        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="eyebrow mb-2">Strongest domain</div>
            <div className="text-[20px] font-semibold tracking-tight">{strongest.label}</div>
            <p className="mt-2 text-[13px] text-[color:var(--muted-foreground)] leading-relaxed">
              Average reliability of <span className="num font-medium text-[color:var(--foreground)]">{strongest.avg.toFixed(1)}</span> across all languages.
              Models converge to similar answers in structured domains with well-defined ground truth.
            </p>
          </Card>
          <Card className="p-6">
            <div className="eyebrow mb-2">Weakest domain</div>
            <div className="text-[20px] font-semibold tracking-tight text-[color:var(--danger)]">{weakest.label}</div>
            <p className="mt-2 text-[13px] text-[color:var(--muted-foreground)] leading-relaxed">
              Average reliability of <span className="num font-medium text-[color:var(--foreground)]">{weakest.avg.toFixed(1)}</span>.
              Models show the highest reliability degradation in this specific subset.
            </p>
          </Card>
        </div>
      </section>

      {/* FAILURE MODE FINGERPRINT */}
      <section className="container-research pb-24 mt-16">
        <div className="mb-6 border-b border-[color:var(--border)] pb-4">
          <h2 className="text-[24px] font-semibold tracking-tight text-[color:var(--foreground)]">Failure Mode Fingerprint</h2>
          <p className="text-[14px] text-[color:var(--muted-foreground)] mt-2">
            Models fail in fundamentally different ways across languages. The gap between the English radar shape and other languages illustrates the Language Safety Gap.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {fingerprintData.map((fd) => {
            return (
              <Card key={fd.model} className="p-5 flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-4">
                  <div className="font-semibold text-[15px]">{fd.model}</div>
                  <div className="text-[10px] uppercase font-bold text-[color:var(--muted-foreground)] bg-[color:var(--surface-muted)] px-2 py-0.5 rounded">Gap: {fd.avgDiff > 0 ? '+' : ''}{fd.avgDiff}%</div>
                </div>
                
                <div className="w-full aspect-square relative -my-4">
                  <FingerprintChart data={fd.data} languages={RADAR_LANGUAGES} />
                </div>
                
                <div className="w-full mt-2 pt-4 border-t border-[color:var(--border)] text-center">
                  <div className="text-[12px] font-medium text-[color:var(--foreground)] mb-3">
                    Multilingual failure <span className="text-[color:var(--danger)] font-bold">{fd.avgDiff > 0 ? '+' : ''}{fd.avgDiff}% higher</span> than English (avg)
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-[9px] text-[color:var(--muted-foreground)] uppercase tracking-wider font-semibold">
                    {RADAR_LANGUAGES.map(l => (
                      <span key={l.name} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm" style={{backgroundColor: l.color}}></span> {l.name}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

function FingerprintChart({ data, languages }: { data: any[], languages: {name: string, color: string}[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
        {languages.map(l => (
          <Radar 
            key={l.name}
            name={l.name} 
            dataKey={l.name} 
            stroke={l.color} 
            fill={l.color} 
            fillOpacity={0.2} 
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

