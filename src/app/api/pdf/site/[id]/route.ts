import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getContext } from "@/lib/context";
import { loadObservations, loadPlans } from "@/lib/queries";
import { addMonths, summarize, todayIso } from "@/lib/domain/schedule";
import { SiteDossier, type SiteDossierData } from "@/lib/pdf/site-dossier";
import type { Equipment, InspectionReport, Intervention, Site } from "@/lib/types";

export const runtime = "nodejs";

/** Dossier de conformité d'un site, en un clic. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  const { data: site } = await ctx.supabase.from("sites").select("*").eq("id", id).eq("org_id", ctx.org.id).maybeSingle<Site>();
  if (!site) return new Response("Site introuvable", { status: 404 });

  const today = todayIso();
  const since = addMonths(today, -12);
  const [plans, observations, eq, reports, interventions] = await Promise.all([
    loadPlans(ctx, { siteId: id }),
    loadObservations(ctx, { siteId: id }),
    ctx.supabase.from("equipment").select("*").eq("site_id", id).eq("archived", false).order("name"),
    ctx.supabase.from("inspection_reports").select("*").eq("site_id", id).order("inspected_on", { ascending: false }).limit(10),
    ctx.supabase
      .from("interventions")
      .select("*, plan:control_plans(label), equipment(name)")
      .eq("site_id", id)
      .gte("performed_on", since)
      .order("performed_on", { ascending: false }),
  ]);

  const data: SiteDossierData = {
    orgName: ctx.org.name,
    site,
    generatedOn: today,
    summary: summarize(plans.map((p) => p.status)),
    plans,
    equipment: (eq.data ?? []) as Equipment[],
    reports: (reports.data ?? []) as InspectionReport[],
    observations: observations.filter((o) => o.status === "ouverte" || (o.lifted_on ?? "") >= since),
    interventions: ((interventions.data ?? []) as (Intervention & { plan: { label: string } | null; equipment: { name: string } | null })[]).map(
      (i) => ({ ...i, plan_label: i.plan?.label ?? null, equipment_name: i.equipment?.name ?? null }),
    ),
  };

  const pdf = await renderToBuffer(createElement(SiteDossier, { d: data }) as Parameters<typeof renderToBuffer>[0]);
  const filename = `conformite-${site.name.replace(/[^\w-]+/g, "_")}-${today}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${filename}"` },
  });
}
