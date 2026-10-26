import { getContext } from "@/lib/context";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { Notice, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { cancelInvitation, inviteMember, removeMember, toggleMyAlerts, updateMember } from "@/app/app/actions/team";

export const metadata = { title: "Équipe" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; invite?: string }>;
}) {
  const ctx = await getContext();
  const { erreur, invite } = await searchParams;
  const [{ data: members }, { data: invitations }] = await Promise.all([
    ctx.supabase.from("memberships").select("user_id, email, role, receives_alerts").eq("org_id", ctx.org.id).order("email"),
    ctx.isAdmin
      ? ctx.supabase.from("invitations").select("id, email, role").eq("org_id", ctx.org.id)
      : Promise.resolve({ data: [] as { id: string; email: string; role: Role }[] }),
  ]);
  const me = (members ?? []).find((m) => m.user_id === ctx.user.id);

  return (
    <>
      <PageHeader title="Équipe" subtitle="Techniciens illimités, quelle que soit l'offre." />
      {erreur && <div className="mb-4"><Notice tone="error">{erreur}</Notice></div>}
      {invite && <div className="mb-4"><Notice tone="ok">Invitation envoyée. La personne rejoindra l&apos;espace en créant son compte avec cette adresse.</Notice></div>}

      {ctx.isAdmin && (
        <form action={inviteMember} className="card mb-6 grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <div><label className="label" htmlFor="email">Inviter par e-mail</label><input id="email" name="email" type="email" required className="input" /></div>
          <div>
            <label className="label" htmlFor="role">Rôle</label>
            <select id="role" name="role" className="input" defaultValue="technicien">
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <SubmitButton>Inviter</SubmitButton>
        </form>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Membre</th><th>Rôle</th><th>Alertes e-mail</th><th></th></tr></thead>
          <tbody>
            {(members ?? []).map((m) => (
              <tr key={m.user_id}>
                <td>{m.email}{m.user_id === ctx.user.id && <span className="text-slate-500"> (vous)</span>}</td>
                {ctx.isAdmin && m.user_id !== ctx.user.id ? (
                  <td colSpan={2}>
                    <form action={updateMember} className="flex flex-wrap items-center gap-3">
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <select name="role" defaultValue={m.role} className="input max-w-[12rem]" aria-label="Rôle">
                        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="receives_alerts" defaultChecked={m.receives_alerts} /> reçoit les alertes</label>
                      <SubmitButton className="btn-secondary">OK</SubmitButton>
                    </form>
                  </td>
                ) : (
                  <>
                    <td>{ROLE_LABELS[m.role as Role]}</td>
                    <td>{m.receives_alerts ? "Oui" : "Non"}</td>
                  </>
                )}
                <td>
                  {ctx.isAdmin && m.user_id !== ctx.user.id && (
                    <form action={removeMember}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <button type="submit" className="text-xs text-risk underline">Retirer</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {(invitations ?? []).map((i) => (
              <tr key={i.id} className="text-slate-500">
                <td>{i.email} (invitation en attente)</td>
                <td>{ROLE_LABELS[i.role as Role]}</td>
                <td>—</td>
                <td>
                  <form action={cancelInvitation}>
                    <input type="hidden" name="id" value={i.id} />
                    <button type="submit" className="text-xs underline">Annuler</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {me && (
        <form action={toggleMyAlerts} className="mt-6 flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="receives_alerts" defaultChecked={me.receives_alerts} />
            Je reçois les alertes d&apos;échéance (J-60, J-30, J-7 et retards)
          </label>
          <SubmitButton className="btn-secondary">Enregistrer</SubmitButton>
        </form>
      )}
    </>
  );
}
