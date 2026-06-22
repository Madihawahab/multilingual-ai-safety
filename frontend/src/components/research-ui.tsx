import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="container-research pt-14 pb-10">
      <div className="eyebrow mb-3">{eyebrow}</div>
      <h1 className="text-[36px] md:text-[44px] font-semibold tracking-tight max-w-3xl leading-[1.1]">
        {title}
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--muted-foreground)] max-w-2xl">
        {description}
      </p>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg " +
        className
      }
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)] font-semibold">
        {label}
      </div>
      <div className="mt-3 text-[32px] font-semibold tracking-tight num text-[color:var(--foreground)]">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[12px] text-[color:var(--muted-foreground)]">{hint}</div>
      )}
    </Card>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-2 text-[14px] text-[color:var(--muted-foreground)] max-w-2xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "danger" | "warning" | "success" | "accent";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[color:var(--surface-muted)] text-[color:var(--muted-foreground)]",
    danger: "bg-[#fef2f2] text-[#b91c1c]",
    warning: "bg-[#fffbeb] text-[#b45309]",
    success: "bg-[#ecfdf5] text-[#047857]",
    accent: "bg-[#ecfeff] text-[#0e7490]",
  };
  return (
    <span
      className={
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide " +
        tones[tone]
      }
    >
      {children}
    </span>
  );
}
