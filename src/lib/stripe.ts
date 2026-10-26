import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { requireEnv } from "@/lib/env";
import { PLANS } from "@/lib/billing";
import type { Plan } from "@/lib/types";

let client: Stripe | null = null;

export function stripe(): Stripe {
  client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return client;
}

export function priceFor(plan: Exclude<Plan, "essai">): string {
  const def = PLANS.find((p) => p.code === plan);
  if (!def) throw new Error("Offre inconnue");
  return requireEnv(def.priceEnv);
}

export function planForPrice(priceId: string): Exclude<Plan, "essai"> | null {
  return PLANS.find((p) => process.env[p.priceEnv] === priceId)?.code ?? null;
}

/** Offre « prestataire » : met à jour la quantité facturée au nombre de sites clients. */
export async function syncProviderSites(orgId: string): Promise<void> {
  const sitePrice = process.env.STRIPE_PRICE_PRESTATAIRE_SITE;
  if (!sitePrice || !process.env.STRIPE_SECRET_KEY) return;
  const db = createAdminClient();
  const { data: org } = await db.from("organizations").select("plan, stripe_subscription_id").eq("id", orgId).single();
  if (!org || org.plan !== "prestataire" || !org.stripe_subscription_id) return;
  const { count } = await db.from("sites").select("*", { count: "exact", head: true }).eq("org_id", orgId);
  const sub = await stripe().subscriptions.retrieve(org.stripe_subscription_id);
  const item = sub.items.data.find((i) => i.price.id === sitePrice);
  const quantity = Math.max(count ?? 0, 0);
  if (item && item.quantity !== quantity) {
    await stripe().subscriptionItems.update(item.id, { quantity, proration_behavior: "create_prorations" });
  } else if (!item && quantity > 0) {
    await stripe().subscriptionItems.create({ subscription: sub.id, price: sitePrice, quantity });
  }
}
