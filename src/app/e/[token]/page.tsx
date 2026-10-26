import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Cible des étiquettes QR collées sur les équipements. */
export default async function QrLanding({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?suite=/e/${token}`);
  const { data } = await supabase.from("equipment").select("id").eq("qr_token", token).maybeSingle();
  if (!data) notFound();
  redirect(`/terrain?equipement=${data.id}`);
}
