import Link from "next/link";
import { getContext } from "@/lib/context";
import { loadPlans, loadSites, siteLabel } from "@/lib/queries";
import { EQUIPMENT_CATEGORIES, categoryLabel } from "@/lib/domain/categories";
import type { Equipment } from "@/lib/types";
import { EmptyState, PageHeader, StatusPill, formatDate } from "@/components/ui";
import type { ComplianceStatus } from "@/lib/domain/schedule";

export const metadata = { title: "Équipements" };

const ORDER: ComplianceStatus[] = ["en_retard", "bientot", "a_planifier", "a_jour"];

export default async function EquipmentListPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; categorie?: string; q?: string }>;
}) {
  const ctx = await getContext();
  const { site, categorie, q } = await searchParams;
  let query = ctx.supabase.from("equipment").select("*").eq("org_id", ctx.org.id).eq("archived", false).order("name");
  if (site) query = query.eq("site_id", site);
  if (categorie) query = query.eq("category", categorie);
  if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  const [{ data }, sites, plans] = await Promise.all([query, loadSites(ctx), loadPlans(ctx)]);
  const equipment = (data ?? []) as Equipment[];
  const siteById = new Map(sites.map((s) => [s.id, s]));

  return (
    <>
      <PageHeader
        title="Équipements"
        subtitle={`${equipment.length} équipement${equipment.length > 1 ? "s" : ""}`}
        actions={ctx.canEdit && (
          <>
            <Link href="/app/import" className="btn-secondary">Importer depuis Excel</Link>
            <Link href="/app/equipements/nouveau" className="btn-primary">+ Équipement</Link>
          </>
        )}
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <label htmlFor="q" className="sr-only">Recherche</label>
        <input id="q" name="q" defaultValue={q} placeholder="Rechercher un repère" className="input max-w-xs" />
        <label htmlFor="site" className="sr-only">Site</label>
        <select id="site" name="site" defaultValue={site ?? ""} className="input max-w-xs">
          <option value="">Tous les sites</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{siteLabel(s)}</option>)}
        </select>
        <label htmlFor="categorie" className="sr-only">Catégorie</label>
        <select id="categorie" name="categorie" defaultValue={categorie ?? ""} className="input max-w-xs">
          <option value="">Toutes les catégories</option>
          {EQUIPMENT_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        <button className="btn-secondary" type="submit">Filtrer</button>
      </form>
      {equipment.length === 0 ? (
        <EmptyState title="Aucun équipement">Ajoutez un équipement ou importez votre inventaire Excel.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>État</th><th>Repère</th><th>Catégorie</th><th>Site</th><th>Fabricant</th><th>Prochaine échéance</th></tr></thead>
            <tbody>
              {equipment.map((e) => {
                const ep = plans.filter((p) => p.equipment_id === e.id);
                const worst = ORDER.find((s) => ep.some((p) => p.status === s));
                const next = ep.find((p) => p.next_due_on)?.next_due_on ?? null;
                return (
                  <tr key={e.id}>
                    <td>{worst ? <StatusPill status={worst} /> : <span className="text-xs text-slate-400">aucun contrôle</span>}</td>
                    <td className="font-medium"><Link href={`/app/equipements/${e.id}`} className="underline decoration-slate-300">{e.name}</Link></td>
                    <td>{categoryLabel(e.category)}</td>
                    <td>{siteLabel(siteById.get(e.site_id) ?? null)}</td>
                    <td>{[e.manufacturer, e.model].filter(Boolean).join(" ") || "—"}</td>
                    <td className="tabular-nums">{formatDate(next)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
