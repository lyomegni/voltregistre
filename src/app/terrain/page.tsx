import Link from "next/link";
import { getContext } from "@/lib/context";
import { loadPlans, siteLabel } from "@/lib/queries";
import { StatusPill, formatDate } from "@/components/ui";
import { PrepareOffline } from "./prepare-offline";

export default async function FieldHome({
  searchParams,
}: {
  searchParams: Promise<{ equipement?: string; tout?: string; enregistre?: string; q?: string }>;
}) {
  const ctx = await getContext();
  const { equipement, tout, enregistre, q } = await searchParams;
  let plans = await loadPlans(ctx, { equipmentId: equipement });
  if (!equipement && !tout && !q) plans = plans.filter((p) => p.status !== "a_jour");
  if (q) {
    const needle = q.toLowerCase();
    plans = plans.filter((p) =>
      [p.label, p.equipment?.name, p.site?.name, p.site?.client_name].some((v) => v?.toLowerCase().includes(needle)),
    );
  }

  const bySite = new Map<string, typeof plans>();
  for (const p of plans) {
    const key = siteLabel(p.site);
    bySite.set(key, [...(bySite.get(key) ?? []), p]);
  }

  return (
    <div className="flex flex-col gap-4">
      {enregistre && (
        <p className="rounded border-l-4 border-ok bg-emerald-50 px-3 py-2 text-sm text-ok">
          Intervention enregistrée. Elle sera envoyée dès que le réseau le permet.
        </p>
      )}
      <form className="flex gap-2">
        <label htmlFor="q" className="sr-only">Rechercher</label>
        <input id="q" name="q" defaultValue={q} placeholder="Équipement, site, contrôle…" className="input" />
        <button className="btn-secondary" type="submit">OK</button>
      </form>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/terrain" className={`rounded border px-3 py-1 ${!tout && !equipement ? "border-ink bg-ink text-white" : "border-slate-300 bg-white"}`}>À faire</Link>
        <Link href="/terrain?tout=1" className={`rounded border px-3 py-1 ${tout ? "border-ink bg-ink text-white" : "border-slate-300 bg-white"}`}>Tous les contrôles</Link>
        <Link href="/app" className="ml-auto self-center text-slate-600 underline">Retour au bureau</Link>
      </div>
      {plans.length === 0 ? (
        <p className="card text-sm text-slate-600">Rien à faire ici. Tous les contrôles sont à jour.</p>
      ) : (
        [...bySite.entries()].map(([site, list]) => (
          <section key={site} className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-semibold">{site}</h2>
            {list.map((p) => (
              <Link key={p.id} href={`/terrain/intervention/${p.id}`} className="card flex items-center justify-between gap-3 active:bg-slate-50">
                <span className="min-w-0">
                  <span className="block font-medium">{p.equipment?.name ?? "Site entier"}</span>
                  <span className="block text-sm text-slate-600">{p.label}</span>
                  <span className="block text-xs text-slate-500">Échéance {formatDate(p.next_due_on)}</span>
                </span>
                <StatusPill status={p.status} />
              </Link>
            ))}
          </section>
        ))
      )}
      <PrepareOffline urls={plans.map((p) => `/terrain/intervention/${p.id}`)} />
    </div>
  );
}
