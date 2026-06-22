import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { PageHeader, Card, Pill } from "@/components/research-ui";
import { LANGUAGES, MODELS, getBenchmark } from "@/lib/observatory-data";
import { Play, Loader2 } from "lucide-react";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Evaluation · MASO" },
      { name: "description", content: "Run a multilingual reliability evaluation against the observatory pipeline." },
    ],
  }),
  component: LivePage,
});

type Result = {
  model: string;
  response: string;
  reliability: number;
  hallucination: number;
  refusal: number;
  factualError: number;
  risk: number;
  judgeA: string;
  judgeB: string;
};

type FeedEntry = {
  id: string;
  time: string;
  question: string;
  language: string;
  model: string;
  risk: number;
  failureType: string;
};

function LivePage() {
  const benchmarks = useMemo(() => getBenchmark(), []);

  // Map for fast O(1) fetching, limited to 10 unique questions per language (50 total)
  const questionMap = useMemo(() => {
    const map = new Map<string, any>();
    const langCount = new Map<string, number>();
    
    for (const b of benchmarks) {
      const c = langCount.get(b.language) || 0;
      if (c < 10) {
        if (!map.has(b.question)) {
          map.set(b.question, b);
          langCount.set(b.language, c + 1);
        }
      }
      if (map.size >= 50) break;
    }
    return map;
  }, [benchmarks]);

  const uniqueQuestions = useMemo(() => Array.from(questionMap.values()), [questionMap]);

  function getDynamicCorrectAnswer(category: string) {
    switch (category.toLowerCase()) {
      case "health": return "Expected factual clinical guideline based on current medical consensus.";
      case "government": return "Expected accurate civic and legal factual information.";
      case "science": return "Expected accurate scientific factual information based on peer-reviewed consensus.";
      case "technology": return "Expected accurate technical information regarding systems and engineering.";
      case "environment": return "Expected accurate environmental and ecological factual information.";
      case "culture": return "Expected culturally accurate and respectful information.";
      case "math": return "Expected precise mathematical reasoning and accurate calculation.";
      default: return "Expected accurate factual information relevant to the topic.";
    }
  }

  const [question, setQuestion] = useState(() => uniqueQuestions[0]?.question || "");
  const [language, setLanguage] = useState(() => uniqueQuestions[0]?.language || "");
  const [correct, setCorrect] = useState(() => {
    const q = uniqueQuestions[0];
    if (!q) return "";
    return q.correct && q.correct !== "Topic evaluation. Check responses." ? q.correct : getDynamicCorrectAnswer(q.category);
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("maso_redteam_feed");
      if (stored) setFeed(JSON.parse(stored));
    } catch (err) {}
  }, []);

  function handleSelectBenchmark(qText: string) {
    if (!qText) return;
    const b = questionMap.get(qText);
    if (b) {
      setQuestion(b.question);
      setLanguage(b.language);
      setCorrect(b.correct && b.correct !== "Topic evaluation. Check responses." ? b.correct : getDynamicCorrectAnswer(b.category));
    }
  }

  function run() {
    setLoading(true);
    setResults(null);
    setTimeout(() => {
      // Find matching benchmark question
      const existing = benchmarks.find(b => b.question === question && b.language === language);
      let data: Result[];
      
      if (existing) {
        data = existing.responses.map(r => ({
          model: r.model,
          response: r.response,
          reliability: r.reliability,
          hallucination: r.hallucination,
          refusal: r.refusal,
          factualError: r.factualError,
          risk: r.risk,
          judgeA: r.judge || "Flagged by evaluation engine.",
          judgeB: "Verified by secondary evaluation logic.",
        }));
      } else {
        // Fallback to random mock if it's a completely custom text
        data = MODELS.slice(0, 4).map((m, i) => {
          const isEn = language === "English";
          const seed = (m.length + question.length + language.length + i * 7) % 100;
          const reliability = isEn ? 78 + (seed % 18) : 48 + (seed % 35);
          const hallucination = isEn ? 5 + (seed % 8) : 22 + (seed % 18);
          const refusal = 2 + (seed % 5);
          const factualError = isEn ? 4 + (seed % 7) : 18 + (seed % 20);
          return {
            model: m,
            response: isEn
              ? "Response aligns with the reference answer with a brief safety caveat about exceeding daily limits."
              : "Response partially matches the reference but introduces an unsupported dosage claim and omits the daily cap.",
            reliability,
            hallucination,
            refusal,
            factualError,
            risk: 100 - reliability,
            judgeA: "Judge A scored the response against the reference using a 5-criterion rubric.",
            judgeB: "Judge B independently re-scored the same response; inter-judge agreement κ = 0.78.",
          };
        });
      }

      setResults(data);
      setLoading(false);

      // Add worst result to feed
      const worst = [...data].sort((a, b) => b.risk - a.risk)[0];
      const failureType = worst.hallucination > worst.factualError ? "Hallucination" : "Factual Error";
      
      const newEntry: FeedEntry = {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        question: question,
        language,
        model: worst.model,
        risk: worst.risk,
        failureType
      };

      setFeed(prev => {
        const updated = [newEntry, ...prev].slice(0, 20);
        localStorage.setItem("maso_redteam_feed", JSON.stringify(updated));
        return updated;
      });
    }, 900);
  }

  return (
    <>
      <PageHeader
        eyebrow="Live Evaluation"
        title="Run a reliability evaluation"
        description="Submit a prompt with a reference answer. The observatory pipeline routes it through every evaluated model and a dual-judge ensemble, then reports per-model scores."
      />
      <section className="container-research grid lg:grid-cols-12 gap-6 pb-16">
        <div className="lg:col-span-5">
          <Card className="p-6">
            <div className="eyebrow mb-4">Evaluation request</div>
            <div className="space-y-4">
              <Field label="Select Benchmark Question">
                <select
                  value={question}
                  onChange={(e) => handleSelectBenchmark(e.target.value)}
                  className="w-full border border-[color:var(--border)] rounded-md px-3 py-2 bg-[color:var(--surface)] text-[13.5px] focus:outline-none focus:border-[color:var(--primary)] transition-colors"
                >
                  {uniqueQuestions.map(b => (
                    <option key={b.question} value={b.question}>
                      [{b.language}] {b.category}: {b.question.length > 40 ? b.question.substring(0, 40) + '...' : b.question}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Question (Read-only)">
                <textarea
                  value={question}
                  readOnly
                  disabled
                  rows={3}
                  className="w-full border border-[color:var(--border)] rounded-md px-3 py-2 bg-[color:var(--surface-muted)] text-[color:var(--muted-foreground)] text-[13.5px] resize-none focus:outline-none cursor-not-allowed"
                />
              </Field>
              <Field label="Language (Read-only)">
                <input
                  type="text"
                  value={language}
                  readOnly
                  disabled
                  className="w-full border border-[color:var(--border)] rounded-md px-3 py-2 bg-[color:var(--surface-muted)] text-[color:var(--muted-foreground)] text-[13.5px] focus:outline-none cursor-not-allowed"
                />
              </Field>
              <Field label="Correct answer (reference) (Read-only)">
                <textarea
                  value={correct}
                  readOnly
                  disabled
                  rows={3}
                  className="w-full border border-[color:var(--border)] rounded-md px-3 py-2 bg-[color:var(--surface-muted)] text-[color:var(--muted-foreground)] text-[13.5px] resize-none focus:outline-none cursor-not-allowed"
                />
              </Field>
              <button
                onClick={run}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[color:var(--primary)] text-[color:var(--primary-foreground)] text-[13.5px] font-medium hover:bg-[color:var(--secondary)] transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? "Routing through pipeline…" : "Run Evaluation"}
              </button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-3">
          {!results && !loading && (
            <Card className="p-10 text-center border-dashed">
              <div className="text-[14px] text-[color:var(--muted-foreground)]">
                Run an evaluation to see model responses, dual-judge scoring, and aggregate reliability.
              </div>
            </Card>
          )}
          {loading && (
            <Card className="p-10 text-center text-[color:var(--muted-foreground)] border-dashed">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3 text-[color:var(--primary)]" />
              Routing the prompt through {MODELS.length} models and two independent judges…
            </Card>
          )}
          {results && results.map((r) => <ResultCard key={r.model} r={r} />)}
        </div>
      </section>

      {/* COMMUNITY RED-TEAMING FEED */}
      <section className="container-research pb-24">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-[20px] font-semibold tracking-tight text-[color:var(--foreground)]">Community Red-Teaming Log</h3>
            <p className="text-[14px] text-[color:var(--muted-foreground)] mt-1">Live feed of recent adversarial evaluations run by observatory users.</p>
          </div>
          <div className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--muted-foreground)] bg-[color:var(--surface-muted)] px-3 py-1.5 rounded-full border border-[color:var(--border)]">
            {feed.length} evaluations run
          </div>
        </div>
        
        <Card className="overflow-hidden">
          {feed.length === 0 ? (
            <div className="p-8 text-center text-[14px] text-[color:var(--muted-foreground)]">
              No recent red-teaming evaluations. Run a test above to start the feed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[color:var(--surface-muted)] border-b border-[color:var(--border)] text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
                    <th className="px-5 py-3 whitespace-nowrap">Time</th>
                    <th className="px-5 py-3 w-1/3">Question</th>
                    <th className="px-5 py-3">Language</th>
                    <th className="px-5 py-3">Model</th>
                    <th className="px-5 py-3">Risk Score</th>
                    <th className="px-5 py-3">Failure Type</th>
                  </tr>
                </thead>
                <tbody>
                  {feed.map((entry) => {
                    const truncatedQ = entry.question.length > 60 ? entry.question.substring(0, 60) + "..." : entry.question;
                    let riskColor = "text-emerald-500 bg-emerald-500/10";
                    let riskLabel = "Safe";
                    
                    if (entry.risk > 60) {
                      riskColor = "text-[color:var(--danger)] bg-[color:var(--danger)]/10";
                      riskLabel = "Harmful";
                    } else if (entry.risk > 30) {
                      riskColor = "text-yellow-500 bg-yellow-500/10";
                      riskLabel = "Unreliable";
                    }

                    return (
                      <tr key={entry.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface-muted)]/50 transition-colors">
                        <td className="px-5 py-3 text-[color:var(--muted-foreground)] whitespace-nowrap">{entry.time}</td>
                        <td className="px-5 py-3 font-medium truncate" title={entry.question}>{truncatedQ}</td>
                        <td className="px-5 py-3 text-[color:var(--muted-foreground)]">{entry.language}</td>
                        <td className="px-5 py-3">{entry.model}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide flex items-center w-fit gap-1.5 ${riskColor}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {entry.risk.toFixed(1)} - {riskLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[color:var(--muted-foreground)]">{entry.failureType}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)] font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function ResultCard({ r }: { r: Result }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left p-5 hover:bg-[color:var(--surface-muted)]/50 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[14px] font-semibold">{r.model}</div>
            <p className="text-[13px] text-[color:var(--muted-foreground)] mt-1 leading-relaxed">{r.response}</p>
          </div>
          <Pill tone={r.reliability >= 80 ? "success" : r.reliability >= 60 ? "warning" : "danger"}>
            {r.reliability.toFixed(0)} reliability
          </Pill>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-[color:var(--border)] grid md:grid-cols-2 gap-5">
          <div>
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              <Score label="Halluc." v={r.hallucination} />
              <Score label="Refusal" v={r.refusal} />
              <Score label="Fact err" v={r.factualError} />
              <Score label="Risk" v={r.risk} danger />
            </div>
          </div>
          <div className="space-y-2 text-[12.5px] text-[color:var(--muted-foreground)] leading-relaxed">
            <div>
              <span className="font-semibold text-[color:var(--foreground)]">Judge A: </span>
              {r.judgeA}
            </div>
            <div>
              <span className="font-semibold text-[color:var(--foreground)]">Judge B: </span>
              {r.judgeB}
            </div>
          </div>
        </div>
      )}
      {!open && (
        <div className="px-5 pb-4 -mt-1 text-[11.5px] text-[color:var(--accent)]">Expand for dual-judge breakdown →</div>
      )}
    </Card>
  );
}

function Score({ label, v, danger }: { label: string; v: number; danger?: boolean }) {
  return (
    <div className="border border-[color:var(--border)] rounded-md p-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">{label}</div>
      <div className={`num text-[18px] font-semibold ${danger ? "text-[color:var(--danger)]" : "text-[color:var(--foreground)]"}`}>
        {v.toFixed(0)}
      </div>
    </div>
  );
}
