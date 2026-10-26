import Link from "next/link";
import { getContext } from "@/lib/context";
import { accessState } from "@/lib/billing";
import { switchOrganization } from "@/app/app/actions/org";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  const access = accessState(ctx.org);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-slate-200 bg-ink text-slate-100 md:min-h-screen md:border-b-0">
        <div className="flex flex-col gap-4 px-4 py-4">
          <Link href="/app" className="font-display text-2xl font-bold text-white">
            Volt<span className="text-volt-bright">Registre</span>
          </Link>
          {ctx.organizations.length > 1 ? (
            <form action={switchOrganization} className="flex gap-2">
              <label htmlFor="org" className="sr-only">Espace</label>
              <select id="org" name="org" defaultValue={ctx.org.id} className="input bg-white text-ink">
                {ctx.organizations.map((o) => (
                  <option key={o.org.id} value={o.org.id}>{o.org.name}</option>
                ))}
              </select>
              <button className="btn-secondary px-2" type="submit">OK</button>
            </form>
          ) : (
            <p className="text-sm text-slate-300">{ctx.org.name}</p>
          )}
          <Nav isAdmin={ctx.isAdmin} />
          <div className="flex flex-col gap-2 border-t border-white/10 pt-4 text-sm">
            <Link href="/terrain" className="btn bg-volt-bright text-ink hover:bg-amber-400">
              Ouvrir l&apos;app terrain
            </Link>
            <p className="truncate text-xs text-slate-400">{ctx.user.email}</p>
            <form action="/auth/deconnexion" method="post">
              <button type="submit" className="text-xs text-slate-300 underline">Se déconnecter</button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        {access.trialDaysLeft !== null && (
          <div className="border-b border-volt/30 bg-volt-soft px-4 py-2 text-sm md:px-8">
            {access.active ? (
              <>Essai gratuit : {access.trialDaysLeft} jour{access.trialDaysLeft > 1 ? "s" : ""} restant{access.trialDaysLeft > 1 ? "s" : ""}. </>
            ) : (
              <>Votre essai est terminé. Vos données restent consultables. </>
            )}
            <Link href="/app/abonnement" className="font-medium underline">Choisir une offre</Link>
          </div>
        )}
        {!access.active && access.trialDaysLeft === null && (
          <div className="border-b border-risk/30 bg-red-50 px-4 py-2 text-sm text-risk md:px-8">
            Votre abonnement n&apos;est plus actif. <Link href="/app/abonnement" className="underline">Le réactiver</Link>
          </div>
        )}
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
