"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/env";

export type AuthState = { error?: string; info?: string };

function safeNext(value: FormDataEntryValue | null): string {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/app";
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: "E-mail ou mot de passe incorrect." };
  redirect(safeNext(form.get("suite")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? "").trim(),
    password,
    options: { emailRedirectTo: `${appUrl()}/auth/callback?suite=/app` },
  });
  if (error) return { error: `Création du compte impossible : ${error.message}` };
  if (!data.session) {
    return { info: "Compte créé. Ouvrez le lien reçu par e-mail pour l'activer." };
  }
  redirect("/app");
}

export async function sendMagicLink(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: String(form.get("email") ?? "").trim(),
    options: { emailRedirectTo: `${appUrl()}/auth/callback?suite=${safeNext(form.get("suite"))}` },
  });
  if (error) return { error: `Envoi impossible : ${error.message}` };
  return { info: "Lien de connexion envoyé. Vérifiez votre boîte de réception." };
}
