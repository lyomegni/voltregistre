"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin, getContext } from "@/lib/context";
import { appUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { check, failTo, required } from "./helpers";

const ROLES = ["admin", "technicien", "lecteur"];

function role(form: FormData) {
  const r = required(form, "role", "Rôle");
  if (!ROLES.includes(r)) throw new Error("Rôle inconnu");
  return r;
}

export async function inviteMember(form: FormData) {
  const ctx = await getContext();
  try {
    assertAdmin(ctx);
    const email = required(form, "email", "E-mail").toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Adresse e-mail invalide");
    check(
      await ctx.supabase
        .from("invitations")
        .upsert({ org_id: ctx.org.id, email, role: role(form), invited_by: ctx.user.id }, { onConflict: "org_id,email" }),
    );
    await sendEmail({
      to: [email],
      subject: `${ctx.org.name} vous invite sur VoltRegistre`,
      html: `<p>Bonjour,</p><p>${ctx.user.email} vous invite à rejoindre l'espace <b>${escapeHtml(ctx.org.name)}</b> sur VoltRegistre, l'outil de suivi de la maintenance et de la conformité électrique.</p><p><a href="${appUrl()}/connexion">Créez votre compte avec cette adresse e-mail</a> pour accéder à l'espace.</p>`,
    });
  } catch (e) {
    failTo("/app/equipe", e);
  }
  revalidatePath("/app/equipe");
  redirect("/app/equipe?invite=1");
}

export async function updateMember(form: FormData) {
  const ctx = await getContext();
  try {
    assertAdmin(ctx);
    const userId = String(form.get("user_id"));
    if (userId === ctx.user.id) throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
    check(
      await ctx.supabase
        .from("memberships")
        .update({ role: role(form), receives_alerts: form.get("receives_alerts") === "on" })
        .eq("org_id", ctx.org.id)
        .eq("user_id", userId),
    );
  } catch (e) {
    failTo("/app/equipe", e);
  }
  revalidatePath("/app/equipe");
  redirect("/app/equipe");
}

export async function toggleMyAlerts(form: FormData) {
  const ctx = await getContext();
  try {
    check(
      await ctx.supabase.rpc("set_my_alerts", {
        org: ctx.org.id,
        enabled: form.get("receives_alerts") === "on",
      }),
    );
  } catch (e) {
    failTo("/app/equipe", e);
  }
  redirect("/app/equipe");
}

export async function removeMember(form: FormData) {
  const ctx = await getContext();
  try {
    assertAdmin(ctx);
    check(
      await ctx.supabase
        .from("memberships")
        .delete()
        .eq("org_id", ctx.org.id)
        .eq("user_id", String(form.get("user_id"))),
    );
  } catch (e) {
    failTo("/app/equipe", e);
  }
  revalidatePath("/app/equipe");
  redirect("/app/equipe");
}

export async function cancelInvitation(form: FormData) {
  const ctx = await getContext();
  try {
    assertAdmin(ctx);
    check(await ctx.supabase.from("invitations").delete().eq("org_id", ctx.org.id).eq("id", String(form.get("id"))));
  } catch (e) {
    failTo("/app/equipe", e);
  }
  revalidatePath("/app/equipe");
  redirect("/app/equipe");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
