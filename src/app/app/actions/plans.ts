"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCanEdit, getContext } from "@/lib/context";
import { templateByCode } from "@/lib/domain/templates";
import { check, dateField, failTo, intField, str } from "./helpers";

export async function addPlan(form: FormData) {
  const ctx = await getContext();
  const back = String(form.get("back") ?? "/app/echeancier");
  try {
    assertCanEdit(ctx);
    const siteId = String(form.get("site_id"));
    const equipmentId = str(form, "equipment_id");
    const code = str(form, "template_code");
    const template = code && code !== "autre" ? templateByCode(code) : undefined;
    const label = template?.label ?? str(form, "label");
    if (!label) throw new Error("Choisissez un modèle ou donnez un nom au contrôle.");
    const periodicity = str(form, "periodicity_months")
      ? intField(form, "periodicity_months", 1, 120)
      : (template?.periodicityMonths ?? 12);
    const lastDone = dateField(form, "last_done_on");
    check(
      await ctx.supabase.from("control_plans").insert({
        org_id: ctx.org.id,
        site_id: siteId,
        equipment_id: equipmentId,
        template_code: template?.code ?? null,
        label,
        reference: template?.reference ?? str(form, "reference"),
        periodicity_months: periodicity,
        checklist: template?.checklist ?? [],
        last_done_on: lastDone,
        first_due_on: lastDone ? null : dateField(form, "first_due_on"),
      }),
    );
  } catch (e) {
    failTo(back, e);
  }
  revalidatePath("/app", "layout");
  redirect(back);
}

export async function updatePlan(form: FormData) {
  const ctx = await getContext();
  const back = String(form.get("back") ?? "/app/echeancier");
  try {
    assertCanEdit(ctx);
    check(
      await ctx.supabase
        .from("control_plans")
        .update({
          periodicity_months: intField(form, "periodicity_months", 1, 120),
          first_due_on: dateField(form, "first_due_on"),
          last_done_on: dateField(form, "last_done_on"),
        })
        .eq("id", String(form.get("id")))
        .eq("org_id", ctx.org.id),
    );
  } catch (e) {
    failTo(back, e);
  }
  revalidatePath("/app", "layout");
  redirect(back);
}

export async function deactivatePlan(form: FormData) {
  const ctx = await getContext();
  const back = String(form.get("back") ?? "/app/echeancier");
  try {
    assertCanEdit(ctx);
    check(
      await ctx.supabase
        .from("control_plans")
        .update({ active: false })
        .eq("id", String(form.get("id")))
        .eq("org_id", ctx.org.id),
    );
  } catch (e) {
    failTo(back, e);
  }
  revalidatePath("/app", "layout");
  redirect(back);
}
