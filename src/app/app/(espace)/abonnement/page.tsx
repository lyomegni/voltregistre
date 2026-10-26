import { getContext } from "@/lib/context";
import { PLANS, accessState } from "@/lib/billing";
import { Notice, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { openBillingPortal, startCheckout } from "@/app/app/actions/billing";

export const metadata = { title: "Abonnement" };

const STATUS: Record<string, string> = {
  active: "Actif",
  trialing: "Période d'essai",
  past_due: "Paiement en retard",
  canceled: "Résilié",
  unpaid: "Impayé",
  incomplete: "Paiement à finaliser",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; succes?: string }>;
}) {
  const ctx = await getContext();
  const { erreur, succes } = await searchParams;
  const access = accessState(ctx.org);
  const current = PLANS.find((p) => p.code === ctx.org.plan);

  return (
    <>
      <PageHeader
        title="Abonnement"
        subtitle={
          current
            ? `Offre ${current.name} · ${STATUS[ctx.org.subscription_status ?? ""] ?? ctx.org.subscription_status ?? "—"}`
            : access.active
              ? `Essai gratuit : ${access.trialDaysLeft} jour(s) restant(s)`
              : "Essai terminé"
        }
        actions={ctx.isAdmin && ctx.org.stripe_customer_id && (
          <form action={openBillingPortal}><SubmitButton className="btn-secondary">Factures et moyen de paiement</SubmitButton></form>
        )}
      />
      {erreur && <div className="mb-4"><Notice tone="error">{erreur}</Notice></div>}
      {succes && <div className="mb-4"><Notice tone="ok">Merci ! Votre abonnement est en cours d&apos;activation.</Notice></div>}
      {!ctx.isAdmin && <div className="mb-4"><Notice>Seul un administrateur peut modifier l&apos;abonnement.</Notice></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const isCurrent = p.code === ctx.org.plan;
          const recommended = (ctx.org.kind === "prestataire") === (p.code === "prestataire");
          return (
            <div key={p.code} className={`card flex flex-col gap-3 ${isCurrent ? "border-2 border-ink" : recommended ? "border-volt" : ""}`}>
              <div>
                <h2 className="h2">{p.name}</h2>
                <p className="text-sm font-medium">{p.price}</p>
              </div>
              <ul className="flex-1 text-sm text-slate-700">
                {p.features.map((f) => <li key={f}>· {f}</li>)}
              </ul>
              {isCurrent ? (
                <p className="text-sm font-medium text-ok">Offre actuelle</p>
              ) : (
                ctx.isAdmin && (
                  <form action={current ? openBillingPortal : startCheckout}>
                    <input type="hidden" name="plan" value={p.code} />
                    <SubmitButton className={recommended ? "btn-primary w-full" : "btn-secondary w-full"} pending="Redirection…">
                      {current ? "Changer pour cette offre" : "Choisir"}
                    </SubmitButton>
                  </form>
                )
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">Prix hors taxes. Paiement sécurisé par Stripe, sans engagement. Remise de 2 mois en paiement annuel sur demande.</p>
    </>
  );
}
