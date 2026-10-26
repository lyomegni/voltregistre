import Link from "next/link";
import { getContext } from "@/lib/context";
import { loadPlans, loadSites, siteLabel } from "@/lib/queries";
import type { InspectionReport } from "@/lib/types";
import { EmptyState, Notice, PageHeader, formatDate } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createReport } from "@/app/app/actions/reports";

export const metadata = { title: "Rapports de contrôle" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; erreur?: string }>;
}) {
  const ctx = await getContext();
  const { site, erreur } = await searchParams;
  const [sites, plans, { data }] = await Promise.all([
    loadSites(ctx),
    loadPlans(ctx),
    ctx.supabase.from("inspection_reports").select("*").eq("org_id", ctx.org.id).order("inspected_on", { ascending: false }),
  ]);
  const reports = (data ?? []) as InspectionReport[];
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const sitePlans = plans.filter((p) => !p.equipment_id);

  return (
    <>
      <PageHeader title="Rapports de contrôle" subtitle="Rapports des organismes de contrôle (Apave, Socotec, Bureau Veritas, Dekra…) et des thermographes." />
      {erreur && <div className="mb-4"><Notice tone="error">{erreur}</Notice></div>}
      {ctx.canEdit && sites.length > 0 && (
        <details className="card mb-6" open={!!site}>
          <summary className="cursor-pointer font-medium">+ Enregistrer un rapport</summary>
          <form action={createReport} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="site_id">Site</label>
              <select id="site_id" name="site_id" className="input" defaultValue={site}>
                {sites.map((s) => <option key={s.id} value={s.id}>{siteLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="control_plan_id">Contrôle concerné</label>
              <select id="control_plan_id" name="control_plan_id" className="input" defaultValue="">
                <option value="">Aucun (rapport libre)</option>
                {sitePlans.map((p) => <option key={p.id} value={p.id}>{siteLabel(p.site)} · {p.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">La date de vérification met à jour l&apos;échéance du contrôle.</p>
            </div>
            <div><label className="label" htmlFor="organism">Organisme</label><input id="organism" name="organism" required className="input" placeholder="Ex. Apave" /></div>
            <div><label className="label" htmlFor="inspected_on">Date de la vérification</label><input id="inspected_on" name="inspected_on" type="date" required className="input" /></div>
            <div><label className="label" htmlFor="received_on">Date de réception du rapport</label><input id="received_on" name="received_on" type="date" className="input" /></div>
            <div><label className="label" htmlFor="file">Rapport PDF</label><input id="file" name="file" type="file" accept="application/pdf" className="text-sm" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="notes">Notes</label><textarea id="notes" name="notes" rows={2} className="input" /></div>
            <div><SubmitButton>Enregistrer et saisir les observations</SubmitButton></div>
          </form>
        </details>
      )}
      {reports.length === 0 ? (
        <EmptyState title="Aucun rapport">Enregistrez le dernier rapport de vérification pour suivre ses observations.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Organisme</th><th>Site</th><th>Reçu le</th><th>PDF</th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="tabular-nums">{formatDate(r.inspected_on)}</td>
                  <td className="font-medium"><Link href={`/app/rapports/${r.id}`} className="underline decoration-slate-300">{r.organism}</Link></td>
                  <td>{siteLabel(siteById.get(r.site_id) ?? null)}</td>
                  <td className="tabular-nums">{formatDate(r.received_on)}</td>
                  <td>{r.file_path ? "Oui" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
