"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCanEdit, getContext } from "@/lib/context";
import { fileFromForm, uploadFile } from "@/lib/storage";
import { checkOne, dateField, failTo, required, str } from "./helpers";

export async function createReport(form: FormData) {
  const ctx = await getContext();
  let id: string;
  try {
    assertCanEdit(ctx);
    const siteId = required(form, "site_id", "Site");
    const inspectedOn = dateField(form, "inspected_on");
    if (!inspectedOn) throw new Error("Champ obligatoire : date de la vérification");
    const file = fileFromForm(form, "file");
    if (file && file.type !== "application/pdf") throw new Error("Le rapport doit être un PDF.");
    const report = checkOne(
      await ctx.supabase
        .from("inspection_reports")
        .insert({
          org_id: ctx.org.id,
          site_id: siteId,
          control_plan_id: str(form, "control_plan_id"),
          organism: required(form, "organism", "Organisme"),
          inspected_on: inspectedOn,
          received_on: dateField(form, "received_on"),
          notes: str(form, "notes"),
          file_path: file ? await uploadFile(ctx.supabase, ctx.org.id, "rapports", file) : null,
        })
        .select("id")
        .single(),
    );
    id = report.id;
  } catch (e) {
    failTo("/app/rapports", e);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/rapports/${id}`);
}
