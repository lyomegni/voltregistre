"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCanEdit, getContext } from "@/lib/context";
import { fileFromForm, uploadFile } from "@/lib/storage";
import { todayIso } from "@/lib/domain/schedule";
import { check, dateField, failTo, required, str } from "./helpers";

const SEVERITIES = ["mineure", "majeure", "critique"] as const;

function severity(form: FormData) {
  const s = str(form, "severity") ?? "majeure";
  if (!SEVERITIES.includes(s as (typeof SEVERITIES)[number])) throw new Error("Gravité inconnue");
  return s;
}

export async function createObservation(form: FormData) {
  const ctx = await getContext();
  const back = String(form.get("back") ?? "/app/observations");
  try {
    assertCanEdit(ctx);
    const photo = fileFromForm(form, "photo_before");
    check(
      await ctx.supabase.from("observations").insert({
        org_id: ctx.org.id,
        site_id: required(form, "site_id", "Site"),
        report_id: str(form, "report_id"),
        equipment_id: str(form, "equipment_id"),
        reference: str(form, "reference"),
        description: required(form, "description", "Description"),
        severity: severity(form),
        due_on: dateField(form, "due_on"),
        photo_before_path: photo ? await uploadFile(ctx.supabase, ctx.org.id, "observations", photo) : null,
      }),
    );
  } catch (e) {
    failTo(back, e);
  }
  revalidatePath("/app", "layout");
  redirect(back);
}

/** Saisie rapide : une observation par ligne, au format « référence | description ». */
export async function createObservationsBulk(form: FormData) {
  const ctx = await getContext();
  const back = String(form.get("back") ?? "/app/observations");
  try {
    assertCanEdit(ctx);
    const lines = String(form.get("lines") ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) throw new Error("Collez au moins une observation.");
    const sev = severity(form);
    check(
      await ctx.supabase.from("observations").insert(
        lines.map((line) => {
          const [a, ...rest] = line.split("|");
          const hasRef = rest.length > 0;
          return {
            org_id: ctx.org.id,
            site_id: required(form, "site_id", "Site"),
            report_id: str(form, "report_id"),
            reference: hasRef ? a.trim() || null : null,
            description: (hasRef ? rest.join("|") : a).trim(),
            severity: sev,
            due_on: dateField(form, "due_on"),
          };
        }),
      ),
    );
  } catch (e) {
    failTo(back, e);
  }
  revalidatePath("/app", "layout");
  redirect(back);
}

export async function liftObservation(form: FormData) {
  const ctx = await getContext();
  const back = String(form.get("back") ?? "/app/observations");
  try {
    assertCanEdit(ctx);
    const photo = fileFromForm(form, "photo_after");
    check(
      await ctx.supabase
        .from("observations")
        .update({
          status: "levee",
          lifted_on: dateField(form, "lifted_on") ?? todayIso(),
          lifted_by: str(form, "lifted_by") ?? ctx.user.email ?? null,
          lift_comment: str(form, "lift_comment"),
          ...(photo
            ? { photo_after_path: await uploadFile(ctx.supabase, ctx.org.id, "observations", photo) }
            : {}),
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

export async function reopenObservation(form: FormData) {
  const ctx = await getContext();
  const back = String(form.get("back") ?? "/app/observations");
  try {
    assertCanEdit(ctx);
    check(
      await ctx.supabase
        .from("observations")
        .update({ status: "ouverte", lifted_on: null, lifted_by: null, lift_comment: null })
        .eq("id", String(form.get("id")))
        .eq("org_id", ctx.org.id),
    );
  } catch (e) {
    failTo(back, e);
  }
  revalidatePath("/app", "layout");
  redirect(back);
}
