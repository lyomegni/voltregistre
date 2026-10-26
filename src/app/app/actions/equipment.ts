"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCanEdit, getContext } from "@/lib/context";
import { CATEGORY_CODES, type EquipmentCategory } from "@/lib/domain/categories";
import { templateByCode } from "@/lib/domain/templates";
import { check, checkOne, dateField, failTo, required, str } from "./helpers";

function equipmentFields(form: FormData) {
  const category = required(form, "category", "Catégorie");
  if (!CATEGORY_CODES.includes(category as EquipmentCategory)) throw new Error("Catégorie inconnue");
  return {
    name: required(form, "name", "Repère"),
    category,
    site_id: required(form, "site_id", "Site"),
    location: str(form, "location"),
    manufacturer: str(form, "manufacturer"),
    model: str(form, "model"),
    serial_number: str(form, "serial_number"),
    commissioned_on: dateField(form, "commissioned_on"),
    rated_power: str(form, "rated_power"),
    notes: str(form, "notes"),
  };
}

export async function createEquipment(form: FormData) {
  const ctx = await getContext();
  let id: string;
  try {
    assertCanEdit(ctx);
    const fields = equipmentFields(form);
    const eq = checkOne(
      await ctx.supabase
        .from("equipment")
        .insert({ org_id: ctx.org.id, ...fields })
        .select("id")
        .single(),
    );
    id = eq.id;
    const chosen = form.getAll("templates").map(String);
    const firstDue = dateField(form, "first_due");
    const templates = chosen
      .map((code) => templateByCode(code))
      .filter((t): t is NonNullable<typeof t> => !!t);
    if (templates.length) {
      check(
        await ctx.supabase.from("control_plans").insert(
          templates.map((t) => ({
            org_id: ctx.org.id,
            site_id: fields.site_id,
            equipment_id: id,
            template_code: t.code,
            label: t.label,
            reference: t.reference,
            periodicity_months: t.periodicityMonths,
            checklist: t.checklist,
            first_due_on: firstDue,
          })),
        ),
      );
    }
  } catch (e) {
    failTo("/app/equipements/nouveau", e);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/equipements/${id}`);
}

export async function updateEquipment(form: FormData) {
  const ctx = await getContext();
  const id = String(form.get("id"));
  try {
    assertCanEdit(ctx);
    const fields = equipmentFields(form);
    check(await ctx.supabase.from("equipment").update(fields).eq("id", id).eq("org_id", ctx.org.id));
    // Les plans suivent l'équipement s'il change de site.
    check(
      await ctx.supabase
        .from("control_plans")
        .update({ site_id: fields.site_id })
        .eq("equipment_id", id)
        .eq("org_id", ctx.org.id),
    );
  } catch (e) {
    failTo(`/app/equipements/${id}`, e);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/equipements/${id}`);
}

export async function archiveEquipment(form: FormData) {
  const ctx = await getContext();
  const id = String(form.get("id"));
  try {
    assertCanEdit(ctx);
    check(
      await ctx.supabase.from("equipment").update({ archived: true }).eq("id", id).eq("org_id", ctx.org.id),
    );
    check(
      await ctx.supabase
        .from("control_plans")
        .update({ active: false })
        .eq("equipment_id", id)
        .eq("org_id", ctx.org.id),
    );
  } catch (e) {
    failTo(`/app/equipements/${id}`, e);
  }
  revalidatePath("/app", "layout");
  redirect("/app/equipements");
}

