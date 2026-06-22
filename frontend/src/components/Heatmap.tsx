import { useState } from "react";
import { reliabilityColor, reliabilityTextColor } from "@/lib/observatory-data";

type Row = { label: string; cells: { col: string; value: number; tooltip?: React.ReactNode }[] };

export function Heatmap({
  rows,
  columns,
  rowLabel = "Model",
  colLabel = "Language",
}: {
  rows: Row[];
  columns: string[];
  rowLabel?: string;
  colLabel?: string;
}) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-[12.5px]">
        <thead>
          <tr>
            <th className="text-left font-medium text-[color:var(--muted-foreground)] uppercase tracking-[0.12em] text-[10.5px] py-2 pr-3 sticky left-0 bg-[color:var(--surface)] z-10">
              {rowLabel} \ {colLabel}
            </th>
            {columns.map((c) => (
              <th
                key={c}
                className="font-medium text-[color:var(--muted-foreground)] uppercase tracking-[0.12em] text-[10.5px] py-2 px-2 text-center"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.label} className="group">
              <td className="py-1.5 pr-3 font-medium text-[color:var(--foreground)] sticky left-0 bg-[color:var(--surface)] whitespace-nowrap">
                {row.label}
              </td>
              {row.cells.map((cell, ci) => {
                const active = hover?.r === ri && hover?.c === ci;
                return (
                  <td key={ci} className="p-0.5 relative">
                    <div
                      onMouseEnter={() => setHover({ r: ri, c: ci })}
                      onMouseLeave={() => setHover(null)}
                      className="num h-9 rounded-sm flex items-center justify-center font-medium cursor-default transition-transform"
                      style={{
                        backgroundColor: reliabilityColor(cell.value),
                        color: reliabilityTextColor(cell.value),
                        outline: active ? "1.5px solid var(--foreground)" : "none",
                      }}
                    >
                      {cell.value.toFixed(0)}
                    </div>
                    {active && cell.tooltip && (
                      <div className={`absolute z-40 left-1/2 -translate-x-1/2 w-64 p-3 rounded-md bg-[color:var(--foreground)] text-[color:var(--primary-foreground)] text-[11.5px] leading-relaxed shadow-lg pointer-events-none ${ri >= rows.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                        {cell.tooltip}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <Legend />
    </div>
  );
}

function Legend() {
  const stops = [40, 50, 60, 70, 80, 90, 95];
  return (
    <div className="flex items-center gap-3 mt-4 text-[11px] text-[color:var(--muted-foreground)]">
      <span className="uppercase tracking-[0.14em]">Reliability score</span>
      <div className="flex">
        {stops.map((s) => (
          <div key={s} className="w-8 h-3" style={{ backgroundColor: reliabilityColor(s) }} />
        ))}
      </div>
      <span>40</span>
      <span className="flex-1" />
      <span>95</span>
    </div>
  );
}
