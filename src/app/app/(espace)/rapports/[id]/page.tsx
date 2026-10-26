import { notFound } from "next/navigation";
import { getContext } from "@/lib/context";
import { loadObservations, siteLabel } from "@/lib/queries";
import { signedUrl } from "@/lib/storage";
import { daysBetween } from "@/lib/domain/schedule";
import type { Equipment, InspectionReport, Site } from "@/lib/types";
import { BackLink, Notice, PageHeader, formatDate } from "@/components/ui";
import { ObservationList } from "@/components/observation-list";
import { SubmitButton } from "@/components/submit-button";
import { createObservation, createObservationsBulk } from "@/app/app/actions/observations";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const ctx = await getContext();
  const { data: report } = await ctx.supabase
    .from("inspection_reports")
    .select("*")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .maybeSingle<InspectionReport>();
  if (!report) notFound();
  const [{ data: site }, { data: eq }, observations, fileUrl] = await Promise.all([
    ctx.supabase.from("sites").select("*").eq("id", report.site_id).single<Site>(),
    ctx.supabase.from("equipment").select("id, name").eq("site_id", report.site_id).eq("archived", false).order("name"),
    loadObservations(ctx, { reportId: id }),
    signedUrl(ctx.supabase, report.file_path),
  ]);
  const equipment = (eq ?? []) as Pick<Equipment, "id" | "name">[];
  const back = `/app/rapports/${id}`;
  const open = observations.filter((o) => o.status === "ouverte").length;
  const delay = report.received_on ? daysBetween(report.inspected_on, report.received_on) : null;

  return (
    <>
      <BackLink href="/app/rapports">Rapports</BackLink>
      <PageHeader
        title={`${report.organism} · ${formatDate(report.inspected_on)}`}
        subtitle={`${siteLabel(site)} · ${observations.length} observation${observations.length > 1 ? "s" : ""}, dont ${open} à lever`}
        actions={fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" className="btn-secondary">Ouvrir le PDF</a>}
      />
      {erreur && <div className="mb-4"><Notice tone="error">{erreur}</Notice></div>}
      {delay !== null && delay > 35 && (
        <div className="mb-4">
          <Notice>Rapport reçu {delay} jours après la vérification : l&apos;arrêté du 26/12/2011 prévoit une remise sous 5 semaines par l&apos;organisme accrédité.</Notice>
        </div>
      )}
      {report.notes && <p className="mb-4 whitespace-pre-line text-sm">{report.notes}</p>}

      {ctx.canEdit && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <details className="card" open={observations.length === 0}>
            <summary className="cursor-pointer font-medium">+ Ajouter une observation</summary>
            <form action={createObservation} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="back" value={back} />
              <input type="hidden" name="site_id" value={report.site_id} />
              <input type="hidden" name="report_id" value={id} />
              <div><label className="label" htmlFor="reference">N° dans le rapport</label><input id="reference" name="reference" className="input" placeholder="Ex. 3.2.1" /></div>
              <div>
                <label className="label" htmlFor="equipment_id">Équipement</label>
                <select id="equipment_id" name="equipment_id" className="input" defaultValue="">
                  <option value="">Non précisé</option>
                  {equipment.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label className="label" htmlFor="description">Observation</label><textarea id="description" name="description" required rows={2} className="input" /></div>
              <div>
                <label className="label" htmlFor="severity">Gravité</label>
                <select id="severity" name="severity" className="input" defaultValue="majeure">
                  <option value="mineure">Mineure</option><option value="majeure">Majeure</option><option value="critique">Critique</option>
                </select>
              </div>
              <div><label className="label" htmlFor="due_on">À lever avant le</label><input id="due_on" name="due_on" type="date" className="input" /></div>
              <div><SubmitButton>Ajouter</SubmitButton></div>
            </form>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-medium">Coller plusieurs observations</summary>
            <form action={createObservationsBulk} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="back" value={back} />
              <input type="hidden" name="site_id" value={report.site_id} />
              <input type="hidden" name="report_id" value={id} />
              <div>
                <label className="label" htmlFor="lines">Une observation par ligne</label>
                <textarea id="lines" name="lines" rows={6} className="input font-mono text-xs" placeholder={"3.1 | Absence de protection mécanique des bornes TGBT\n3.2 | Différentiel 30 mA du circuit prises atelier inopérant"} />
                <p className="mt-1 text-xs text-slate-500">Format : « référence | description ». La référence est facultative.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <select name="severity" className="input max-w-[12rem]" defaultValue="majeure" aria-label="Gravité">
                  <option value="mineure">Mineure</option><option value="majeure">Majeure</option><option value="critique">Critique</option>
                </select>
                <input name="due_on" type="date" className="input max-w-[12rem]" aria-label="À lever avant le" />
              </div>
              <div><SubmitButton>Importer les lignes</SubmitButton></div>
            </form>
          </details>
        </div>
      )}
      <ObservationList observations={observations} canEdit={ctx.canEdit} back={back} showSite={false} />
    </>
  );
}
