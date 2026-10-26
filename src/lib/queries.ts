import type { AppContext } from "@/lib/context";
import { complianceStatus, todayIso, type ComplianceStatus } from "@/lib/domain/schedule";
import type { ControlPlan, Equipment, Observation, Site } from "@/lib/types";

export type PlanRow = ControlPlan & {
  status: ComplianceStatus;
  equipment: Pick<Equipment, "id" | "name" | "category"> | null;
  site: Pick<Site, "id" | "name" | "client_name"> | null;
};

export async function loadPlans(
  ctx: AppContext,
  filter: { siteId?: string; equipmentId?: string } = {},
): Promise<PlanRow[]> {
  let q = ctx.supabase
    .from("control_plans")
    .select("*, equipment(id, name, category), site:sites(id, name, client_name)")
    .eq("org_id", ctx.org.id)
    .eq("active", true)
    .order("next_due_on", { ascending: true, nullsFirst: true });
  if (filter.siteId) q = q.eq("site_id", filter.siteId);
  if (filter.equipmentId) q = q.eq("equipment_id", filter.equipmentId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const today = todayIso();
  return (data ?? []).map((p) => ({
    ...(p as unknown as PlanRow),
    status: complianceStatus(p.next_due_on, today),
  }));
}

export async function loadSites(ctx: AppContext): Promise<Site[]> {
  const { data, error } = await ctx.supabase
    .from("sites")
    .select("*")
    .eq("org_id", ctx.org.id)
    .order("client_name", { nullsFirst: true })
    .order("name");
  if (error) throw new Error(error.message);
  return data as Site[];
}

export type ObservationRow = Observation & {
  equipment: Pick<Equipment, "id" | "name"> | null;
  site: Pick<Site, "id" | "name" | "client_name"> | null;
  report: { id: string; organism: string; inspected_on: string } | null;
};

export async function loadObservations(
  ctx: AppContext,
  filter: { siteId?: string; status?: "ouverte" | "levee"; reportId?: string; equipmentId?: string } = {},
): Promise<ObservationRow[]> {
  let q = ctx.supabase
    .from("observations")
    .select(
      "*, equipment(id, name), site:sites(id, name, client_name), report:inspection_reports(id, organism, inspected_on)",
    )
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });
  if (filter.siteId) q = q.eq("site_id", filter.siteId);
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.reportId) q = q.eq("report_id", filter.reportId);
  if (filter.equipmentId) q = q.eq("equipment_id", filter.equipmentId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as unknown as ObservationRow[];
}

export function siteLabel(site: Pick<Site, "name" | "client_name"> | null): string {
  if (!site) return "—";
  return site.client_name ? `${site.client_name} · ${site.name}` : site.name;
}
