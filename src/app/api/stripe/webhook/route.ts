import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { planForPrice, stripe } from "@/lib/stripe";
import { requireEnv } from "@/lib/env";

export const runtime = "nodejs";

/** Synchronise l'offre et l'état de l'abonnement de chaque organisation depuis Stripe. */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature absente" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const db = createAdminClient();

  async function applySubscription(sub: Stripe.Subscription) {
    const orgId = sub.metadata.org_id;
    if (!orgId) return;
    const plan = sub.items.data.map((i) => planForPrice(i.price.id)).find(Boolean) ?? sub.metadata.plan;
    await db
      .from("organizations")
      .update({
        stripe_subscription_id: sub.id,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        subscription_status: sub.status,
        ...(plan ? { plan } : {}),
      })
      .eq("id", orgId);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await applySubscription(await stripe().subscriptions.retrieve(id));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object);
      break;
  }
  return NextResponse.json({ received: true });
}
