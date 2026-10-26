import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/context";
import { loadObservations, loadPlans, siteLabel } from "@/lib/queries";
import { categoryLabel } from "@/lib/domain/categories";
import { summarize } from "@/lib/domain/schedule";
import type { Equipment, InspectionReport, Site } from "@/lib/types";
import { BackLink, Notice, PageHeader, formatDate } from "@/components/ui";
import { PlanEditor } from "@/components/plan-editor";
import { SubmitButton } from "@/components/submit-button";
import { deleteSite, updateSite } from "@/app/app/actions/sites";
import { ObservationList } from "@/components/observation-list";

export default async function SitePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const ctx = await getContext();
  const { data: site } = await ctx.supabase
    .from("sites")
    .select("*")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .maybeSingle<Site>();
  if (!site) notFound();

  const [plans, observations, equipmentRes, reportsRes] = await Promise.all([
    loadPlans(ctx, { siteId: id }),
    loadObservations(ctx, { siteId: id, status: "ouverte" }),
    ctx.supabase.from("equipment").select("*").eq("site_id", id).eq("archived", false).order("name"),
    ctx.supabase.from("inspection_reports").select("*").eq("site_id", id).order("inspected_on", { ascending: false }).limit(5),
  ]);
  const equipment = (equipmentRes.data ?? []) as Equipment[];
  const reports = (reportsRes.data ?? []) as InspectionReport[];
  const sitePlans = plans.filter((p) => !p.equipment_id);
  const s = summarize(plans.map((p) => p.status));
  const back = `/app/sites/${id}`;

  return (
    <>
      <BackLink href="/app/sites">Sites</BackLink>
      <PageHeader
        title={site.name}
        subtitle={[site.client_name, site.address].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <a href={`/api/pdf/site/${id}`} className="btn-primary">Dossier de conformité PDF</a>
            {ctx.canEdit && (
              <Link href={`/app/equipements/nouveau?site=${id}`} className="btn-secondary">+ Équipement</Link>
            )}
          </>
        }
      />
      {erreur && <div className="mb-4"><Notice tone="error">{erreur}</Notice></div>}

      <p className="mb-6 text-sm">
        {s.rate === null ? "Aucun contrôle planifié." : <><b>{s.rate} %</b> des contrôles à jour</>}
        {s.en_retard > 0 && <span className="text-risk"> · {s.en_retard} en retard</span>}
        {s.bientot > 0 && <span className="text-warn"> · {s.bientot} sous 60 jours</span>}
        {observations.length > 0 && <> · {observations.length} observation{observations.length > 1 ? "s" : ""} à lever</>}
      </p>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="h2">Contrôles réglementaires du site</h2>
          <PlanEditor plans={sitePlans} siteId={id} back={back} canEdit={ctx.canEdit} />
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="h2">Derniers rapports de contrôle</h2>
            <Link href={`/app/rapports?site=${id}`} className="text-sm underline">Ajouter un rapport</Link>
          </div>
          {reports.length === 0 ? (
            <p className="text-sm text-slate-600">Aucun rapport enregistré.</p>
          ) : (
            <ul className="card divide-y divide-slate-100 p-0">
              {reports.map((r) => (
                <li key={r.id} className="px-4 py-2 text-sm">
                  <Link href={`/app/rapports/${r.id}`} className="font-medium underline decoration-slate-300">
                    {r.organism}
                  </Link>{" "}
                  · vérifié le {formatDate(r.inspected_on)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="h2">Équipements ({equipment.length})</h2>
        {equipment.length === 0 ? (
          <p className="text-sm text-slate-600">
            Aucun équipement. <Link href={`/app/equipements/nouveau?site=${id}`} className="underline">Ajoutez-en un</Link> ou{" "}
            <Link href="/app/import" className="underline">importez votre fichier Excel</Link>.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Repère</th><th>Catégorie</th><th>Localisation</th><th>Contrôles</th><th>Prochaine échéance</th></tr></thead>
              <tbody>
                {equipment.map((e) => {
                  const ep = plans.filter((p) => p.equipment_id === e.id);
                  const next = ep.find((p) => p.next_due_on)?.next_due_on ?? null;
                  const late = ep.filter((p) => p.status === "en_retard").length;
                  return (
                    <tr key={e.id}>
                      <td className="font-medium"><Link href={`/app/equipements/${e.id}`} className="underline decoration-slate-300">{e.name}</Link></td>
                      <td>{categoryLabel(e.category)}</td>
                      <td>{e.location ?? "—"}</td>
                      <td className="tabular-nums">{ep.length}{late > 0 && <span className="text-risk"> ({late} en retard)</span>}</td>
                      <td className="tabular-nums">{formatDate(next)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="h2">Observations à lever</h2>
        <ObservationList observations={observations} canEdit={ctx.canEdit} back={back} showSite={false} />
      </section>

      {ctx.canEdit && (
        <details className="card mt-10">
          <summary className="cursor-pointer text-sm font-medium">Modifier le site</summary>
          <form action={updateSite} className="mt-4 grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="id" value={id} />
            <div><label className="label" htmlFor="name">Nom</label><input id="name" name="name" defaultValue={site.name} required className="input" /></div>
            <div><label className="label" htmlFor="client_name">Client</label><input id="client_name" name="client_name" defaultValue={site.client_name ?? ""} className="input" /></div>
            <div><label className="label" htmlFor="address">Adresse</label><input id="address" name="address" defaultValue={site.address ?? ""} className="input" /></div>
            <div><SubmitButton className="btn-secondary">Enregistrer</SubmitButton></div>
          </form>
          {ctx.isAdmin && (
            <form action={deleteSite} className="mt-6 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
              <input type="hidden" name="id" value={id} />
              <div>
                <label className="label" htmlFor="confirm">Supprimer {siteLabel(site)} : tapez SUPPRIMER</label>
                <input id="confirm" name="confirm" className="input" autoComplete="off" />
              </div>
              <SubmitButton className="btn-danger">Supprimer le site</SubmitButton>
            </form>
          )}
        </details>
      )}
    </>
  );
}
