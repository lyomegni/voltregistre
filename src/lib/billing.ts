import type { Organization, Plan } from "@/lib/types";

export const PLANS: {
  code: Exclude<Plan, "essai">;
  name: string;
  price: string;
  maxSites: number;
  features: string[];
  priceEnv: string;
}[] = [
  {
    code: "essentiel",
    name: "Essentiel",
    price: "49 € HT / mois",
    maxSites: 1,
    features: ["1 site, 150 équipements", "Utilisateurs illimités", "Alertes et rapports PDF"],
    priceEnv: "STRIPE_PRICE_ESSENTIEL",
  },
  {
    code: "pro",
    name: "Pro",
    price: "99 € HT / mois",
    maxSites: 3,
    features: ["Jusqu'à 3 sites", "Suivi des observations", "App terrain hors ligne"],
    priceEnv: "STRIPE_PRICE_PRO",
  },
  {
    code: "multisites",
    name: "Multi-sites",
    price: "199 € HT / mois",
    maxSites: 10,
    features: ["Jusqu'à 10 sites", "Tableau de bord consolidé", "Rôles avancés"],
    priceEnv: "STRIPE_PRICE_MULTISITES",
  },
  {
    code: "prestataire",
    name: "Prestataire",
    price: "149 € HT / mois + 5 € par site client",
    maxSites: 1000,
    features: ["Sites de tous vos clients", "Regroupement par client", "Rapports à votre nom"],
    priceEnv: "STRIPE_PRICE_PRESTATAIRE",
  },
];

export const TRIAL_MAX_SITES = 3;

export function maxSites(org: Pick<Organization, "plan">): number {
  if (org.plan === "essai") return TRIAL_MAX_SITES;
  return PLANS.find((p) => p.code === org.plan)?.maxSites ?? 1;
}

/** L'organisation peut-elle utiliser l'application (essai en cours ou abonnement actif) ? */
export function accessState(
  org: Pick<Organization, "plan" | "trial_ends_at" | "subscription_status">,
  now = new Date(),
): { active: boolean; trialDaysLeft: number | null } {
  if (org.plan !== "essai") {
    const ok = ["active", "trialing", "past_due"].includes(org.subscription_status ?? "");
    return { active: ok, trialDaysLeft: null };
  }
  const left = Math.ceil((new Date(org.trial_ends_at).getTime() - now.getTime()) / 86_400_000);
  return { active: left > 0, trialDaysLeft: Math.max(0, left) };
}
