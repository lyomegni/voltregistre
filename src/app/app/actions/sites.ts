"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin, assertCanEdit, getContext } from "@/lib/context";
import { maxSites } from "@/lib/billing";
import { syncProviderSites } from "@/lib/stripe";
import { siteTemplates } from "@/lib/domain/templates";
import { check, checkOne, dateField, failTo, required, str } from "./helpers";

export async function createSite(form: FormData) {
  const ctx = await getContext();
  let id: string;
  try {
    assertCanEdit(ctx);
    const { count } = await ctx.supabase
      .from("sites")
      .select("*", { count: "exact", head: true })
      .eq("org_id", ctx.org.id);
    if ((count ?? 0) >= maxSites(ctx.org)) {
      throw new Error("Votre offre ne permet pas d'ajouter un site de plus. Passez à l'offre supérieure.");
    }
    const site = checkOne(
      await ctx.supabase
        .from("sites")
        .insert({
          org_id: ctx.org.id,
          name: required(form, "name", "Nom du site"),
          client_name: str(form, "client_name"),
          address: str(form, "address"),
        })
        .select("id")
        .single(),
    );
    id = site.id;

    // Contrôles réglementaires au niveau du site (VPIE).
    const lastVpie = dateField(form, "last_vpie");
    const firstDue = dateField(form, "first_due");
    check(
      await ctx.supabase.from("control_plans").insert(
        siteTemplates().map((t) => ({
          org_id: ctx.org.id,
          site_id: id,
          template_code: t.code,
          label: t.label,
          reference: t.reference,
          periodicity_months: t.periodicityMonths,
          checklist: t.checklist,
          last_done_on: lastVpie,
          first_due_on: lastVpie ? null : firstDue,
        })),
      ),
    );
  } catch (e) {
    failTo("/app/sites?nouveau=1", e);
  }
  await syncProviderSites(ctx.org.id).catch((e) => console.error("[stripe] synchro des sites", e));
  revalidatePath("/app", "layout");
  redirect(`/app/sites/${id}`);
}

export async function updateSite(form: FormData) {
  const ctx = await getContext();
  const id = String(form.get("id"));
  try {
    assertCanEdit(ctx);
    check(
      await ctx.supabase
        .from("sites")
        .update({
          name: required(form, "name", "Nom du site"),
          client_name: str(form, "client_name"),
          address: str(form, "address"),
        })
        .eq("id", id)
        .eq("org_id", ctx.org.id),
    );
  } catch (e) {
    failTo(`/app/sites/${id}`, e);
  }
  revalidatePath(`/app/sites/${id}`);
  redirect(`/app/sites/${id}`);
}

export async function deleteSite(form: FormData) {
  const ctx = await getContext();
  const id = String(form.get("id"));
  try {
    assertAdmin(ctx);
    if (form.get("confirm") !== "SUPPRIMER") {
      throw new Error("Tapez SUPPRIMER pour confirmer la suppression du site et de toutes ses données.");
    }
    check(await ctx.supabase.from("sites").delete().eq("id", id).eq("org_id", ctx.org.id));
  } catch (e) {
    failTo(`/app/sites/${id}`, e);
  }
  await syncProviderSites(ctx.org.id).catch((e) => console.error("[stripe] synchro des sites", e));
  revalidatePath("/app", "layout");
  redirect("/app/sites");
}
