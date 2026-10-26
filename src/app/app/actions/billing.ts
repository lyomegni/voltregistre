"use server";

import { redirect } from "next/navigation";
import { assertAdmin, getContext } from "@/lib/context";
import { createAdminClient } from "@/lib/supabase/server";
import { priceFor, stripe } from "@/lib/stripe";
import { PLANS } from "@/lib/billing";
import { appUrl } from "@/lib/env";
import { failTo } from "./helpers";

export async function startCheckout(form: FormData) {
  const ctx = await getContext();
  let url: string;
  try {
    assertAdmin(ctx);
    const plan = PLANS.find((p) => p.code === form.get("plan"))?.code;
    if (!plan) throw new Error("Offre inconnue");
    let customer = ctx.org.stripe_customer_id;
    if (!customer) {
      const c = await stripe().customers.create({
        email: ctx.user.email ?? undefined,
        name: ctx.org.name,
        metadata: { org_id: ctx.org.id },
        preferred_locales: ["fr"],
      });
      customer = c.id;
      await createAdminClient().from("organizations").update({ stripe_customer_id: customer }).eq("id", ctx.org.id);
    }
    const lineItems = [{ price: priceFor(plan), quantity: 1 }];
    if (plan === "prestataire" && process.env.STRIPE_PRICE_PRESTATAIRE_SITE) {
      const { count } = await ctx.supabase.from("sites").select("*", { count: "exact", head: true }).eq("org_id", ctx.org.id);
      if ((count ?? 0) > 0) lineItems.push({ price: process.env.STRIPE_PRICE_PRESTATAIRE_SITE, quantity: count ?? 0 });
    }
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: lineItems,
      locale: "fr",
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      customer_update: { address: "auto", name: "auto" },
      automatic_tax: { enabled: true },
      client_reference_id: ctx.org.id,
      metadata: { org_id: ctx.org.id, plan },
      subscription_data: { metadata: { org_id: ctx.org.id, plan } },
      success_url: `${appUrl()}/app/abonnement?succes=1`,
      cancel_url: `${appUrl()}/app/abonnement`,
    });
    if (!session.url) throw new Error("Stripe n'a pas renvoyé de page de paiement.");
    url = session.url;
  } catch (e) {
    failTo("/app/abonnement", e);
  }
  redirect(url);
}

export async function openBillingPortal() {
  const ctx = await getContext();
  let url: string;
  try {
    assertAdmin(ctx);
    if (!ctx.org.stripe_customer_id) throw new Error("Aucun abonnement à gérer.");
    const session = await stripe().billingPortal.sessions.create({
      customer: ctx.org.stripe_customer_id,
      return_url: `${appUrl()}/app/abonnement`,
      locale: "fr",
    });
    url = session.url;
  } catch (e) {
    failTo("/app/abonnement", e);
  }
  redirect(url);
}
