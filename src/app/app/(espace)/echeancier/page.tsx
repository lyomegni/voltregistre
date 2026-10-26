import Link from "next/link";
import { getContext } from "@/lib/context";
import { loadPlans, loadSites, siteLabel } from "@/lib/queries";
import { STATUS_LABELS, type ComplianceStatus } from "@/lib/domain/schedule";
import { EmptyState, PageHeader } from "@/components/ui";
import { PlanTable } from "@/components/plan-table";

export const metadata = { title: "Échéancier" };

const FILTERS: (ComplianceStatus | "")[] = ["", "en_retard", "bientot", "a_planifier", "a_jour"];

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string; site?: string }>;
}) {
  const ctx = await getContext();
  const { etat, site } = await searchParams;
  const [all, sites] = await Promise.all([loadPlans(ctx, { siteId: site || undefined }), loadSites(ctx)]);
  const plans = etat ? all.filter((p) => p.status === etat) : all;

  return (
    <>
      <PageHeader title="Échéancier" subtitle="Tous les contrôles suivis, du plus urgent au plus lointain." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count = f ? all.filter((p) => p.status === f).length : all.length;
          const active = (etat ?? "") === f;
          const params = new URLSearchParams({ ...(f ? { etat: f } : {}), ...(site ? { site } : {}) });
          return (
            <Link
              key={f || "tous"}
              href={`/app/echeancier${params.size ? `?${params}` : ""}`}
              className={`rounded border px-3 py-1 text-sm ${active ? "border-ink bg-ink text-white" : "border-slate-300 bg-white"}`}
            >
              {f ? STATUS_LABELS[f] : "Tous"} <span className="tabular-nums opacity-70">{count}</span>
            </Link>
          );
        })}
        <form className="ml-auto flex gap-2">
          {etat && <input type="hidden" name="etat" value={etat} />}
          <label htmlFor="site" className="sr-only">Site</label>
          <select id="site" name="site" defaultValue={site ?? ""} className="input">
            <option value="">Tous les sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{siteLabel(s)}</option>)}
          </select>
          <button className="btn-secondary" type="submit">OK</button>
        </form>
      </div>
      {plans.length === 0 ? (
        <EmptyState title="Aucun contrôle dans cette vue" />
      ) : (
        <PlanTable plans={plans} />
      )}
    </>
  );
}
