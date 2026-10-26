import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_LABELS, type ComplianceStatus } from "@/lib/domain/schedule";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<ComplianceStatus, string> = {
  en_retard: "bg-red-50 text-risk border-risk/30",
  bientot: "bg-amber-50 text-warn border-warn/30",
  a_jour: "bg-emerald-50 text-ok border-ok/30",
  a_planifier: "bg-slate-50 text-slate-600 border-slate-300",
};

export function StatusPill({ status }: { status: ComplianceStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[11px] ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "warn" | "risk" }) {
  const tones = {
    neutral: "bg-slate-50 text-slate-700 border-slate-300",
    ok: "bg-emerald-50 text-ok border-ok/30",
    warn: "bg-amber-50 text-warn border-warn/30",
    risk: "bg-red-50 text-risk border-risk/30",
  };
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Field({
  label,
  name,
  children,
  hint,
}: {
  label: string;
  name: string;
  children?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-start gap-2 border-dashed py-8">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="max-w-prose text-sm text-slate-600">{children}</div>}
      {action}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "ok"; children: ReactNode }) {
  const tones = {
    info: "border-volt bg-volt-soft",
    error: "border-risk bg-red-50 text-risk",
    ok: "border-ok bg-emerald-50 text-ok",
  };
  return <div className={`border-l-4 px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-2 inline-block text-sm text-slate-600 hover:text-ink">
      ← {children}
    </Link>
  );
}
