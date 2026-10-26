import Link from "next/link";
import { getContext } from "@/lib/context";
import { loadPlans, loadSites } from "@/lib/queries";
import { summarize } from "@/lib/domain/schedule";
import { maxSites } from "@/lib/billing";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createSite } from "@/app/app/actions/sites";

export const metadata = { title: "Sites" };

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ nouveau?: string; erreur?: string }>;
}) {
  const ctx = await getContext();
  const { nouveau, erreur } = await searchParams;
  const [sites, plans] = await Promise.all([loadSites(ctx), loadPlans(ctx)]);
  const { count: equipmentCount } = await ctx.supabase
    .from("equipment")
    .select("site_id", { count: "exact", head: true })
    .eq("org_id", ctx.org.id)
    .eq("archived", false);
  const isProvider = ctx.org.kind === "prestataire";
  const limit = maxSites(ctx.org);

  const groups = new Map<string, typeof sites>();
  for (const s of sites) {
    const key = isProvider ? (s.client_name ?? "Sans client") : "";
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  return (
    <>
      <PageHeader
        title={isProvider ? "Clients et sites" : "Sites"}
        subtitle={`${sites.length} site${sites.length > 1 ? "s" : ""} sur ${limit >= 1000 ? "illimité" : limit} inclus dans votre offre · ${equipmentCount ?? 0} équipements`}
      />
      {erreur && <div className="mb-4"><Notice tone="error">{erreur}</Notice></div>}

      {ctx.canEdit && (
        <details className="card mb-6" open={nouveau === "1" || sites.length === 0}>
          <summary className="cursor-pointer font-medium">+ Nouveau site</summary>
          <form action={createSite} className="mt-4 grid gap-4 sm:grid-cols-2">
            {isProvider && (
              <div>
                <label className="label" htmlFor="client_name">Client</label>
                <input id="client_name" name="client_name" className="input" placeholder="Ex. Fonderie Dupont" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="name">Nom du site</label>
              <input id="name" name="name" required className="input" placeholder="Ex. Usine de Vénissieux" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address">Adresse</label>
              <input id="address" name="address" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="last_vpie">Date de la dernière vérification périodique</label>
              <input id="last_vpie" name="last_vpie" type="date" className="input" />
              <p className="mt-1 text-xs text-slate-500">Celle du dernier rapport de l&apos;organisme de contrôle.</p>
            </div>
            <div>
              <label className="label" htmlFor="first_due">Ou prochaine vérification prévue</label>
              <input id="first_due" name="first_due" type="date" className="input" />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>Créer le site</SubmitButton>
            </div>
          </form>
        </details>
      )}

      {sites.length === 0 ? (
        <EmptyState title="Aucun site pour l'instant">Créez un site avec le formulaire ci-dessus.</EmptyState>
      ) : (
        [...groups.entries()].map(([client, list]) => (
          <section key={client} className="mb-6">
            {client && <h2 className="h2 mb-2">{client}</h2>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((site) => {
                const s = summarize(plans.filter((p) => p.site_id === site.id).map((p) => p.status));
                return (
                  <Link key={site.id} href={`/app/sites/${site.id}`} className="card flex flex-col gap-1 hover:border-ink">
                    <span className="font-display text-lg font-semibold">{site.name}</span>
                    {site.address && <span className="text-xs text-slate-500">{site.address}</span>}
                    <span className="mt-2 text-sm">
                      {s.rate === null ? "Aucun contrôle planifié" : `${s.rate} % conforme`}
                      {s.en_retard > 0 && <span className="text-risk"> · {s.en_retard} en retard</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </>
  );
}
