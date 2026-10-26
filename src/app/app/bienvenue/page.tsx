import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { createOrganization } from "./actions";

export const metadata = { title: "Bienvenue" };

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Un collègue a peut-être déjà invité cet utilisateur.
  const { data: accepted } = await supabase.rpc("accept_pending_invitations");
  const { count } = await supabase
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((accepted ?? 0) > 0 || (count ?? 0) > 0) redirect("/app");

  const { erreur } = await searchParams;
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="h1">Créez votre espace</h1>
      <p className="mt-2 text-sm text-slate-600">
        Votre espace regroupe vos sites, vos équipements et votre équipe. Vous pourrez inviter vos
        collègues ensuite.
      </p>
      <form action={createOrganization} className="card mt-6 flex flex-col gap-4">
        {erreur && <p className="text-sm text-risk">{erreur}</p>}
        <div>
          <label htmlFor="name" className="label">Nom de l&apos;entreprise</label>
          <input id="name" name="name" required className="input" placeholder="Ex. Électricité Martin" />
        </div>
        <fieldset>
          <legend className="label">Vous êtes</legend>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="radio" name="kind" value="industriel" defaultChecked className="mt-1" />
              <span>
                <b>Un site industriel</b> qui suit ses propres installations
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="kind" value="prestataire" className="mt-1" />
              <span>
                <b>Une entreprise de maintenance</b> qui intervient chez plusieurs clients
              </span>
            </label>
          </div>
        </fieldset>
        <SubmitButton>Commencer l&apos;essai de 14 jours</SubmitButton>
      </form>
    </main>
  );
}
