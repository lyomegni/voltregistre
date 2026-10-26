import Link from "next/link";
import { getContext } from "@/lib/context";
import { loadObservations, loadSites, siteLabel } from "@/lib/queries";
import { Notice, PageHeader } from "@/components/ui";
import { ObservationList } from "@/components/observation-list";
import { SubmitButton } from "@/components/submit-button";
import { createObservation } from "@/app/app/actions/observations";

export const metadata = { title: "Observations" };

export default async function ObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; site?: string; erreur?: string }>;
}) {
  const ctx = await getContext();
  const { statut, site, erreur } = await searchParams;
  const status = statut === "levee" ? "levee" : statut === "toutes" ? undefined : "ouverte";
  const [observations, sites] = await Promise.all([
    loadObservations(ctx, { status, siteId: site || undefined }),
    loadSites(ctx),
  ]);
  const order = { critique: 0, majeure: 1, mineure: 2 };
  observations.sort((a, b) => order[a.severity] - order[b.severity]);
  const back = `/app/observations${statut || site ? `?${new URLSearchParams({ ...(statut ? { statut } : {}), ...(site ? { site } : {}) })}` : ""}`;

  return (
    <>
      <PageHeader title="Observations" subtitle="Non-conformités relevées par les organismes de contrôle ou vos techniciens, jusqu'à leur levée." />
      {erreur && <div className="mb-4"><Notice tone="error">{erreur}</Notice></div>}
      <div className="mb-4 flex flex-wrap gap-2">
        {[["", "À lever"], ["levee", "Levées"], ["toutes", "Toutes"]].map(([v, l]) => (
          <Link key={v} href={`/app/observations${v ? `?statut=${v}` : ""}`} className={`rounded border px-3 py-1 text-sm ${(statut ?? "") === v ? "border-ink bg-ink text-white" : "border-slate-300 bg-white"}`}>{l}</Link>
        ))}
      </div>
      {ctx.canEdit && sites.length > 0 && (
        <details className="card mb-6">
          <summary className="cursor-pointer font-medium">+ Nouvelle observation</summary>
          <form action={createObservation} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="back" value={back} />
            <div>
              <label className="label" htmlFor="site_id">Site</label>
              <select id="site_id" name="site_id" className="input" defaultValue={site}>
                {sites.map((s) => <option key={s.id} value={s.id}>{siteLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="severity">Gravité</label>
              <select id="severity" name="severity" className="input" defaultValue="majeure">
                <option value="mineure">Mineure</option>
                <option value="majeure">Majeure</option>
                <option value="critique">Critique</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">Description</label>
              <textarea id="description" name="description" required rows={2} className="input" />
            </div>
            <div><label className="label" htmlFor="due_on">À lever avant le</label><input id="due_on" name="due_on" type="date" className="input" /></div>
            <div><label className="label" htmlFor="photo_before">Photo</label><input id="photo_before" name="photo_before" type="file" accept="image/*" capture="environment" className="text-sm" /></div>
            <div><SubmitButton>Enregistrer</SubmitButton></div>
          </form>
        </details>
      )}
      <ObservationList observations={observations} canEdit={ctx.canEdit} back={back} />
    </>
  );
}
