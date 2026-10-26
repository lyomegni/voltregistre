"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ORG_COOKIE } from "@/lib/context";

export async function switchOrganization(form: FormData) {
  const org = String(form.get("org") ?? "");
  (await cookies()).set(ORG_COOKIE, org, { path: "/", httpOnly: true, sameSite: "lax" });
  redirect("/app");
}
