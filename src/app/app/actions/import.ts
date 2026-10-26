"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCanEdit, getContext } from "@/lib/context";
import { maxSites } from "@/lib/billing";
import { syncProviderSites } from "@/lib/stripe";
import { CATEGORY_CODES, normalize } from "@/lib/domain/categories";
import { templatesForCategory } from "@/lib/domain/templates";

const rowSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(CATEGORY_CODES),
  siteName: z.string().max(200).nullable(),
  location: z.string().max(200).nullable(),
  manufacturer: z.string().max(200).nullable(),
  model: z.string().max(200).nullable(),
  serialNumber: z.string().max(200).nullable(),
  commissionedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  ratedPower: z.string().max(100).nullable(),
});

export type ImportOutcome = { ok: true; created: number; sitesCreated: number } | { ok: false; error: string };

export async function importEquipment(input: {
  rows: unknown[];
  defaultSiteId: string;
  addPlans: boolean;
}): Promise<ImportOutcome> {
  const ctx = await getContext();
  try {
    assertCanEdit(ctx);
    const rows = z.array(rowSchema).max(2000).parse(input.rows);
    if (rows.length === 0) return { ok: false, error: "Aucune ligne à importer." };

    const { data: sites, error } = await ctx.supabase.from("sites").select("id, name").eq("org_id", ctx.org.id);
    if (error) throw new Error(error.message);
    const byName = new Map((sites ?? []).map((s) => [normalize(s.name), s.id as string]));
    if (input.defaultSiteId && !(sites ?? []).some((s) => s.id === input.defaultSiteId)) {
      throw new Error("Site par défaut introuvable.");
    }

    // Crée les sites mentionnés dans le fichier qui n'existent pas encore, dans la limite de l'offre.
    const missing = [...new Set(rows.map((r) => r.siteName).filter((n): n is string => !!n && !byName.has(normalize(n))))];
    if ((sites?.length ?? 0) + missing.length > maxSites(ctx.org)) {
      throw new Error(`Le fichier mentionne ${missing.length} nouveau(x) site(s) : votre offre n'en permet pas autant.`);
    }
    for (const name of missing) {
      const { data, error: e } = await ctx.supabase
        .from("sites")
        .insert({ org_id: ctx.org.id, name })
        .select("id")
        .single();
      if (e) throw new Error(e.message);
      byName.set(normalize(name), data.id);
    }

    const payload = rows.map((r) => {
      const siteId = (r.siteName && byName.get(normalize(r.siteName))) || input.defaultSiteId;
      if (!siteId) throw new Error(`Aucun site pour « ${r.name} » : choisissez un site par défaut.`);
      return {
        org_id: ctx.org.id,
        site_id: siteId,
        name: r.name,
        category: r.category,
        location: r.location,
        manufacturer: r.manufacturer,
        model: r.model,
        serial_number: r.serialNumber,
        commissioned_on: r.commissionedOn,
        rated_power: r.ratedPower,
      };
    });

    const { data: created, error: insertError } = await ctx.supabase
      .from("equipment")
      .insert(payload)
      .select("id, site_id, category");
    if (insertError) throw new Error(insertError.message);

    if (input.addPlans && created?.length) {
      const plans = created.flatMap((e) =>
        templatesForCategory(e.category).map((t) => ({
          org_id: ctx.org.id,
          site_id: e.site_id,
          equipment_id: e.id,
          template_code: t.code,
          label: t.label,
          reference: t.reference,
          periodicity_months: t.periodicityMonths,
          checklist: t.checklist,
        })),
      );
      if (plans.length) {
        const { error: planError } = await ctx.supabase.from("control_plans").insert(plans);
        if (planError) throw new Error(planError.message);
      }
    }

    if (missing.length) {
      await syncProviderSites(ctx.org.id).catch((e) => console.error("[stripe] synchro des sites", e));
    }
    revalidatePath("/app", "layout");
    return { ok: true, created: created?.length ?? 0, sitesCreated: missing.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inattendue" };
  }
}
