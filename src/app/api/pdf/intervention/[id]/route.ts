import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getContext } from "@/lib/context";
import { BUCKET } from "@/lib/storage";
import { InterventionReport } from "@/lib/pdf/intervention-report";
import type { Intervention } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  const { data } = await ctx.supabase
    .from("interventions")
    .select("*, plan:control_plans(label, reference), equipment(name), site:sites(name, client_name)")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .maybeSingle();
  if (!data) return new Response("Intervention introuvable", { status: 404 });
  const i = data as Intervention & {
    plan: { label: string; reference: string | null } | null;
    equipment: { name: string } | null;
    site: { name: string; client_name: string | null } | null;
  };
  const { data: photoRows } = await ctx.supabase.from("intervention_photos").select("path").eq("intervention_id", id);

  async function load(path: string | null) {
    if (!path) return null;
    const { data: blob } = await ctx.supabase.storage.from(BUCKET).download(path);
    if (!blob) return null;
    return { data: Buffer.from(await blob.arrayBuffer()), format: path.endsWith(".png") ? ("png" as const) : ("jpg" as const) };
  }

  const [signature, ...photos] = await Promise.all([load(i.signature_path), ...(photoRows ?? []).map((p) => load(p.path))]);
  const pdf = await renderToBuffer(
    createElement(InterventionReport, {
      d: {
        orgName: ctx.org.name,
        siteName: i.site ? (i.site.client_name ? `${i.site.client_name} · ${i.site.name}` : i.site.name) : "",
        equipmentName: i.equipment?.name ?? null,
        planLabel: i.plan?.label ?? null,
        reference: i.plan?.reference ?? null,
        intervention: i,
        signature,
        photos: photos.filter((p): p is NonNullable<typeof p> => !!p),
      },
    }) as Parameters<typeof renderToBuffer>[0],
  );
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="intervention-${i.performed_on}.pdf"`,
    },
  });
}
