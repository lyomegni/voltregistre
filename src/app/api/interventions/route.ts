import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { uploadFile } from "@/lib/storage";
import { dataUrlToBlob } from "@/lib/data-url";
import { accessState } from "@/lib/billing";

const dataUrl = z.string().regex(/^data:image\/(jpeg|png);base64,/).max(4_000_000);

const schema = z.object({
  client_ref: z.uuid(),
  control_plan_id: z.uuid(),
  performed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  technician_name: z.string().max(200),
  result: z.enum(["conforme", "reserves", "non_conforme"]),
  checklist: z
    .array(z.object({ label: z.string().max(500), ok: z.boolean().nullable(), comment: z.string().max(2000).optional() }))
    .max(100),
  measures: z.string().max(10_000),
  comments: z.string().max(10_000),
  signed_by: z.string().max(200),
  signature: dataUrl.nullable(),
  photos: z.array(dataUrl).max(10),
});

/** Reçoit une intervention saisie sur le terrain (en ligne ou synchronisée après coup). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const body = parsed.data;

  // Déjà reçue (double envoi après une coupure réseau) : rien à refaire.
  const { data: existing } = await supabase.from("interventions").select("id").eq("client_ref", body.client_ref).maybeSingle();
  if (existing) return NextResponse.json({ id: existing.id });

  const { data: plan } = await supabase
    .from("control_plans")
    .select("id, org_id, site_id, equipment_id")
    .eq("id", body.control_plan_id)
    .maybeSingle();
  if (!plan) return NextResponse.json({ error: "Contrôle introuvable" }, { status: 404 });
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, trial_ends_at, subscription_status")
    .eq("id", plan.org_id)
    .single();
  // Abonnement expiré : on renvoie 402 pour que le téléphone garde l'intervention en attente.
  if (!org || !accessState(org).active) {
    return NextResponse.json({ error: "Abonnement inactif" }, { status: 402 });
  }

  try {
    const signaturePath = body.signature
      ? await uploadFile(supabase, plan.org_id, "signatures", dataUrlToBlob(body.signature))
      : null;
    const { data: intervention, error } = await supabase
      .from("interventions")
      .insert({
        org_id: plan.org_id,
        site_id: plan.site_id,
        control_plan_id: plan.id,
        equipment_id: plan.equipment_id,
        client_ref: body.client_ref,
        performed_on: body.performed_on,
        technician_id: user.id,
        technician_name: body.technician_name || user.email,
        result: body.result,
        checklist: body.checklist,
        measures: body.measures || null,
        comments: body.comments || null,
        signed_by: body.signed_by || null,
        signature_path: signaturePath,
      })
      .select("id")
      .single();
    if (error) {
      const status = error.code === "42501" ? 403 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const paths = await Promise.all(
      body.photos.map((p) => uploadFile(supabase, plan.org_id, "interventions", dataUrlToBlob(p))),
    );
    if (paths.length) {
      await supabase
        .from("intervention_photos")
        .insert(paths.map((path) => ({ org_id: plan.org_id, intervention_id: intervention.id, path })));
    }

    // Chaque point non conforme devient une observation à lever.
    const failed = body.checklist.filter((c) => c.ok === false);
    if (failed.length) {
      await supabase.from("observations").insert(
        failed.map((c) => ({
          org_id: plan.org_id,
          site_id: plan.site_id,
          equipment_id: plan.equipment_id,
          intervention_id: intervention.id,
          description: c.comment ? `${c.label} : ${c.comment}` : c.label,
          severity: "majeure",
        })),
      );
    }
    return NextResponse.json({ id: intervention.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
