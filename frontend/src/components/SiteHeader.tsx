import { Link, useRouterState } from "@tanstack/react-router";

const nav = [
  { to: "/", label: "Overview" },
  { to: "/language-gap", label: "Language Gap Explorer" },
  { to: "/domains", label: "Domain Analysis" },
  { to: "/failures", label: "Failure Explorer" },
  { to: "/benchmarks", label: "Benchmark Explorer" },
  { to: "/live", label: "Live Evaluation" },
  { to: "/healthcare-risk-report", label: "Healthcare Risk Report" },
  { to: "/safety-thresholds", label: "Safety Thresholds" },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 bg-[color:var(--surface)]/90 backdrop-blur border-b border-[color:var(--border)]">
      <div className="w-full px-4 md:px-8 flex items-center gap-4 lg:gap-8 h-16">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="w-7 h-7 rounded-md bg-[color:var(--primary)] flex items-center justify-center">
            <span className="block w-3 h-3 rounded-sm bg-[color:var(--accent)]" />
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-tight text-[color:var(--foreground)]">
              Multilingual AI Safety Observatory
            </div>
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
              Research Preview · v0.4
            </div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-auto overflow-x-auto flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={[
                  "px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-[color:var(--surface-muted)] text-[color:var(--foreground)]"
                    : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
                ].join(" ")}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--border)] mt-24">
      <div className="container-research py-10 grid md:grid-cols-3 gap-8 text-[13px] text-[color:var(--muted-foreground)]">
        <div>
          <div className="text-[color:var(--foreground)] font-semibold mb-2">Multilingual AI Safety Observatory</div>
          <p className="leading-relaxed">
            An independent research initiative measuring how large language model
            reliability degrades outside of English.
          </p>
        </div>
        <div>
          <div className="text-[color:var(--foreground)] font-semibold mb-2">Methodology</div>
          <p className="leading-relaxed">
            Dual-judge evaluation pipeline · 95% bootstrap confidence intervals ·
            Reproducible benchmark released under CC-BY.
          </p>
        </div>
        <div>
          <div className="text-[color:var(--foreground)] font-semibold mb-2">Contact</div>
          <p className="leading-relaxed">
            For research inquiries and dataset access, contact the observatory
            team. Findings are advisory and pre-publication.
          </p>
        </div>
      </div>
      <div className="border-t border-[color:var(--border)]">
        <div className="container-research py-4 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
          <span>© {new Date().getFullYear()} Observatory Research Group</span>
          <span>Last updated · Q2 2026</span>
        </div>
      </div>
    </footer>
  );
}
