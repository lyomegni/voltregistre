import Link from "next/link";
import { getContext } from "@/lib/context";
import { loadSites, siteLabel } from "@/lib/queries";
import { RESULT_LABELS, type Intervention } from "@/lib/types";
import { EmptyState, PageHeader, Pill, formatDate } from "@/components/ui";

export const metadata = { title: "Interventions" };

export default async function InterventionsPage() {
  const ctx = await getContext();
  const [{ data }, sites] = await Promise.all([
    ctx.supabase
      .from("interventions")
      .select("*, equipment(name), plan:control_plans(label)")
      .eq("org_id", ctx.org.id)
      .order("performed_on", { ascending: false })
      .limit(200),
    loadSites(ctx),
  ]);
  const rows = (data ?? []) as (Intervention & { equipment: { name: string } | null; plan: { label: string } | null })[];
  const siteById = new Map(sites.map((s) => [s.id, s]));
  return (
    <>
      <PageHeader title="Interventions" subtitle="Rapports d'intervention saisis par vos techniciens." actions={<Link href="/terrain" className="btn-primary">Nouvelle intervention</Link>} />
      {rows.length === 0 ? (
        <EmptyState title="Aucune intervention">Les interventions saisies depuis l&apos;app terrain apparaîtront ici.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Résultat</th><th>Contrôle</th><th>Équipement</th><th>Site</th><th>Technicien</th></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td className="tabular-nums"><Link href={`/app/interventions/${i.id}`} className="underline decoration-slate-300">{formatDate(i.performed_on)}</Link></td>
                  <td><Pill tone={i.result === "conforme" ? "ok" : i.result === "reserves" ? "warn" : "risk"}>{RESULT_LABELS[i.result]}</Pill></td>
                  <td>{i.plan?.label ?? "—"}</td>
                  <td>{i.equipment?.name ?? "Site entier"}</td>
                  <td>{siteLabel(siteById.get(i.site_id) ?? null)}</td>
                  <td>{i.technician_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
