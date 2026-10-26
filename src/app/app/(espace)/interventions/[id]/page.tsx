import { notFound } from "next/navigation";
import { getContext } from "@/lib/context";
import { signedUrl } from "@/lib/storage";
import { RESULT_LABELS, type Intervention } from "@/lib/types";
import { BackLink, PageHeader, Pill, formatDate } from "@/components/ui";

export default async function InterventionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  const { data } = await ctx.supabase
    .from("interventions")
    .select("*, equipment(id, name), plan:control_plans(label, reference), site:sites(name, client_name)")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .maybeSingle();
  if (!data) notFound();
  const i = data as Intervention & {
    equipment: { id: string; name: string } | null;
    plan: { label: string; reference: string | null } | null;
    site: { name: string; client_name: string | null } | null;
  };
  const { data: photos } = await ctx.supabase.from("intervention_photos").select("path").eq("intervention_id", id);
  const [signature, ...photoUrls] = await Promise.all([
    signedUrl(ctx.supabase, i.signature_path),
    ...(photos ?? []).map((p) => signedUrl(ctx.supabase, p.path)),
  ]);

  return (
    <>
      <BackLink href={i.equipment ? `/app/equipements/${i.equipment.id}` : "/app/interventions"}>{i.equipment?.name ?? "Interventions"}</BackLink>
      <PageHeader
        title={i.plan?.label ?? "Intervention"}
        subtitle={`${formatDate(i.performed_on)} · ${i.site?.name ?? ""} · ${i.technician_name ?? ""}`}
        actions={<a href={`/api/pdf/intervention/${id}`} className="btn-secondary">Rapport PDF</a>}
      />
      <div className="mb-4"><Pill tone={i.result === "conforme" ? "ok" : i.result === "reserves" ? "warn" : "risk"}>{RESULT_LABELS[i.result]}</Pill></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="h2 mb-2">Points de contrôle</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {i.checklist.map((c, n) => (
              <li key={n} className="flex gap-2">
                <span className={`font-mono text-xs ${c.ok === true ? "text-ok" : c.ok === false ? "text-risk" : "text-slate-400"}`}>{c.ok === true ? "OK" : c.ok === false ? "NOK" : "N/A"}</span>
                <span>{c.label}{c.comment && <span className="block text-xs text-slate-500">{c.comment}</span>}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card flex flex-col gap-2 text-sm">
          {i.measures && <div><h3 className="label">Mesures</h3><p className="whitespace-pre-line">{i.measures}</p></div>}
          {i.comments && <div><h3 className="label">Commentaires</h3><p className="whitespace-pre-line">{i.comments}</p></div>}
          {signature && (
            <div>
              <h3 className="label">Signature {i.signed_by && `de ${i.signed_by}`}</h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signature} alt="Signature" className="h-24 rounded border border-slate-200 bg-white" />
            </div>
          )}
        </section>
      </div>
      {photoUrls.length > 0 && (
        <section className="mt-6">
          <h2 className="h2 mb-2">Photos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photoUrls.map((u, n) => u && (
              <a key={n} href={u} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Photo ${n + 1}`} className="aspect-square w-full rounded object-cover" />
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
