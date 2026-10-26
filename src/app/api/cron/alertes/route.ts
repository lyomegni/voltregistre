import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { alertForToday, todayIso } from "@/lib/domain/schedule";
import { buildDigest, type DigestItem } from "@/lib/domain/digest";
import { accessState } from "@/lib/billing";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import type { Organization } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Appelé chaque matin par Vercel Cron : envoie les alertes J-60, J-30, J-7 et les retards. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const db = createAdminClient();
  const today = todayIso();

  const { data: plans, error } = await db
    .from("control_plans")
    .select("id, org_id, label, next_due_on, equipment(name), site:sites(name, client_name)")
    .eq("active", true)
    .not("next_due_on", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const due = (plans ?? [])
    .map((p) => ({ p, alert: alertForToday(p.next_due_on, today) }))
    .filter((x): x is typeof x & { alert: NonNullable<typeof x.alert> } => x.alert !== null);
  if (due.length === 0) return NextResponse.json({ sent: 0 });

  const { data: already } = await db
    .from("alert_log")
    .select("control_plan_id, threshold")
    .eq("sent_on", today)
    .in("control_plan_id", due.map((d) => d.p.id));
  const sentKey = new Set((already ?? []).map((a) => `${a.control_plan_id}:${a.threshold}`));

  const byOrg = new Map<string, DigestItem[]>();
  for (const { p, alert } of due) {
    if (sentKey.has(`${p.id}:${alert}`)) continue;
    const site = p.site as unknown as { name: string; client_name: string | null } | null;
    const item: DigestItem = {
      planId: p.id,
      label: p.label,
      equipmentName: (p.equipment as unknown as { name: string } | null)?.name ?? null,
      siteName: site ? (site.client_name ? `${site.client_name} · ${site.name}` : site.name) : "",
      dueOn: p.next_due_on!,
      alert,
    };
    byOrg.set(p.org_id, [...(byOrg.get(p.org_id) ?? []), item]);
  }

  const { data: orgs } = await db.from("organizations").select("*").in("id", [...byOrg.keys()]);
  let sent = 0;
  for (const org of (orgs ?? []) as Organization[]) {
    if (!accessState(org).active) continue;
    const { data: members } = await db
      .from("memberships")
      .select("email")
      .eq("org_id", org.id)
      .eq("receives_alerts", true)
      .in("role", ["admin", "technicien"]);
    const to = (members ?? []).map((m) => m.email).filter(Boolean);
    const items = byOrg.get(org.id)!;
    if (to.length === 0) continue;
    const { subject, html } = buildDigest(org.name, items, appUrl());
    if (await sendEmail({ to, subject, html })) {
      sent++;
      await db.from("alert_log").insert(
        items.map((i) => ({ control_plan_id: i.planId, due_on: i.dueOn, threshold: String(i.alert), sent_on: today })),
      );
    }
  }
  return NextResponse.json({ sent, organizations: byOrg.size });
}
