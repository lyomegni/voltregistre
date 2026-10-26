import Link from "next/link";
import { getContext } from "@/lib/context";
import { loadObservations, loadPlans, loadSites, siteLabel } from "@/lib/queries";
import { summarize } from "@/lib/domain/schedule";
import { EmptyState, PageHeader } from "@/components/ui";
import { PlanTable } from "@/components/plan-table";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const ctx = await getContext();
  const [plans, sites, openObs] = await Promise.all([
    loadPlans(ctx),
    loadSites(ctx),
    loadObservations(ctx, { status: "ouverte" }),
  ]);

  if (sites.length === 0) {
    return (
      <>
        <PageHeader title="Tableau de bord" />
        <EmptyState
          title="Commencez par créer votre premier site"
          action={<Link href="/app/sites?nouveau=1" className="btn-primary">Créer un site</Link>}
        >
          Un site correspond à un établissement (usine, entrepôt, bâtiment). Vous y rattacherez
          ensuite les équipements et leurs contrôles, ou vous les importerez depuis Excel.
        </EmptyState>
      </>
    );
  }

  const s = summarize(plans.map((p) => p.status));
  const critical = openObs.filter((o) => o.severity === "critique").length;
  const urgent = plans.filter((p) => p.status === "en_retard" || p.status === "bientot").slice(0, 12);

  const perSite = sites.map((site) => {
    const sitePlans = plans.filter((p) => p.site_id === site.id);
    return {
      site,
      summary: summarize(sitePlans.map((p) => p.status)),
      openObs: openObs.filter((o) => o.site_id === site.id).length,
    };
  });

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle={`${sites.length} site${sites.length > 1 ? "s" : ""} · ${plans.length} contrôles suivis`} />
      <dl className="grid grid-cols-2 overflow-hidden rounded border-2 border-ink bg-white lg:grid-cols-4">
        <Stat label="Taux de conformité" value={s.rate === null ? "—" : `${s.rate} %`} tone={s.rate !== null && s.rate < 90 ? "risk" : "ok"} />
        <Stat label="Contrôles en retard" value={String(s.en_retard)} tone={s.en_retard > 0 ? "risk" : "ok"} />
        <Stat label="À réaliser sous 60 jours" value={String(s.bientot)} tone={s.bientot > 0 ? "warn" : "ok"} />
        <Stat label="Observations à lever" value={String(openObs.length)} detail={critical ? `dont ${critical} critique${critical > 1 ? "s" : ""}` : undefined} tone={critical ? "risk" : openObs.length ? "warn" : "ok"} />
      </dl>

      <section className="mt-8 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="h2">À traiter en priorité</h2>
          <Link href="/app/echeancier" className="text-sm underline">Tout l&apos;échéancier</Link>
        </div>
        {urgent.length ? (
          <PlanTable plans={urgent} />
        ) : (
          <p className="text-sm text-slate-600">Aucun contrôle en retard ni à réaliser dans les 60 prochains jours.</p>
        )}
        {s.a_planifier > 0 && (
          <p className="text-sm text-warn">
            {s.a_planifier} contrôle{s.a_planifier > 1 ? "s n'ont" : " n'a"} pas encore de date. <Link href="/app/echeancier?etat=a_planifier" className="underline">Les planifier</Link>
          </p>
        )}
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="h2">Par site</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Site</th><th>Conformité</th><th>En retard</th><th>Sous 60 j</th><th>Observations</th><th></th></tr>
            </thead>
            <tbody>
              {perSite.map(({ site, summary, openObs }) => (
                <tr key={site.id}>
                  <td className="font-medium"><Link href={`/app/sites/${site.id}`} className="underline decoration-slate-300">{siteLabel(site)}</Link></td>
                  <td className="tabular-nums">{summary.rate === null ? "—" : `${summary.rate} %`}</td>
                  <td className={`tabular-nums ${summary.en_retard ? "font-semibold text-risk" : ""}`}>{summary.en_retard}</td>
                  <td className="tabular-nums">{summary.bientot}</td>
                  <td className="tabular-nums">{openObs}</td>
                  <td><a href={`/api/pdf/site/${site.id}`} className="text-sm underline">Dossier PDF</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone: "ok" | "warn" | "risk" }) {
  const color = { ok: "text-ok", warn: "text-warn", risk: "text-risk" }[tone];
  return (
    <div className="border-b border-r border-slate-200 px-4 py-3">
      <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-1 font-display text-3xl font-semibold tabular-nums ${color}`}>{value}</dd>
      {detail && <dd className="text-xs text-slate-600">{detail}</dd>}
    </div>
  );
}
