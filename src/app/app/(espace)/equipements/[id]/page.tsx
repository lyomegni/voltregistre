import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getContext } from "@/lib/context";
import { loadObservations, loadPlans, loadSites, siteLabel } from "@/lib/queries";
import { categoryLabel } from "@/lib/domain/categories";
import { appUrl } from "@/lib/env";
import { RESULT_LABELS, type Equipment, type Intervention } from "@/lib/types";
import { BackLink, Notice, PageHeader, Pill, formatDate } from "@/components/ui";
import { PlanEditor } from "@/components/plan-editor";
import { EquipmentForm } from "@/components/equipment-form";
import { ObservationList } from "@/components/observation-list";
import { archiveEquipment, updateEquipment } from "@/app/app/actions/equipment";

export default async function EquipmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const ctx = await getContext();
  const { data: equipment } = await ctx.supabase
    .from("equipment")
    .select("*")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .maybeSingle<Equipment>();
  if (!equipment) notFound();

  const [plans, sites, observations, interventionsRes] = await Promise.all([
    loadPlans(ctx, { equipmentId: id }),
    loadSites(ctx),
    loadObservations(ctx, { equipmentId: id }),
    ctx.supabase.from("interventions").select("*").eq("equipment_id", id).order("performed_on", { ascending: false }).limit(20),
  ]);
  const interventions = (interventionsRes.data ?? []) as Intervention[];
  const site = sites.find((s) => s.id === equipment.site_id) ?? null;
  const qrUrl = `${appUrl()}/e/${equipment.qr_token}`;
  const qrSvg = await QRCode.toString(qrUrl, { type: "svg", margin: 1, width: 160 });
  const back = `/app/equipements/${id}`;

  const facts: [string, string | null][] = [
    ["Catégorie", categoryLabel(equipment.category)],
    ["Site", siteLabel(site)],
    ["Localisation", equipment.location],
    ["Fabricant", equipment.manufacturer],
    ["Modèle", equipment.model],
    ["N° de série", equipment.serial_number],
    ["Puissance / calibre", equipment.rated_power],
    ["Mise en service", equipment.commissioned_on ? formatDate(equipment.commissioned_on) : null],
  ];

  return (
    <>
      <BackLink href={site ? `/app/sites/${site.id}` : "/app/equipements"}>{site ? site.name : "Équipements"}</BackLink>
      <PageHeader
        title={equipment.name}
        subtitle={categoryLabel(equipment.category)}
        actions={ctx.canEdit && plans[0] && (
          <Link href={`/terrain/intervention/${plans[0].id}`} className="btn-primary">Saisir une intervention</Link>
        )}
      />
      {erreur && <div className="mb-4"><Notice tone="error">{erreur}</Notice></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        <dl className="card grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{k}</dt>
              <dd className="text-sm">{v ?? "—"}</dd>
            </div>
          ))}
          {equipment.notes && (
            <div className="sm:col-span-2">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Notes</dt>
              <dd className="whitespace-pre-line text-sm">{equipment.notes}</dd>
            </div>
          )}
        </dl>
        <div className="card flex flex-col items-center gap-2 text-center">
          <div className="w-40" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="text-xs text-slate-600">Étiquette à coller sur l&apos;équipement. Le scan ouvre sa fiche.</p>
          <a href={`/api/qr/${equipment.id}`} className="text-xs underline">Télécharger l&apos;étiquette (SVG)</a>
        </div>
      </div>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="h2">Contrôles</h2>
        <PlanEditor plans={plans} siteId={equipment.site_id} equipmentId={id} back={back} canEdit={ctx.canEdit} />
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="h2">Historique des interventions</h2>
        {interventions.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune intervention enregistrée.</p>
        ) : (
          <ul className="card divide-y divide-slate-100 p-0">
            {interventions.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                <span className="tabular-nums">{formatDate(i.performed_on)}</span>
                <Pill tone={i.result === "conforme" ? "ok" : i.result === "reserves" ? "warn" : "risk"}>{RESULT_LABELS[i.result]}</Pill>
                <Link href={`/app/interventions/${i.id}`} className="underline decoration-slate-300">
                  {plans.find((p) => p.id === i.control_plan_id)?.label ?? "Intervention"}
                </Link>
                <span className="text-slate-500">{i.technician_name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="h2">Observations</h2>
        <ObservationList observations={observations} canEdit={ctx.canEdit} back={back} showSite={false} />
      </section>

      {ctx.canEdit && (
        <details className="card mt-10">
          <summary className="cursor-pointer text-sm font-medium">Modifier l&apos;équipement</summary>
          <div className="mt-4">
            <EquipmentForm action={updateEquipment} sites={sites} equipment={equipment} />
          </div>
          <form action={archiveEquipment} className="mt-6 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="btn-danger">Retirer cet équipement du parc</button>
            <p className="mt-1 text-xs text-slate-500">L&apos;historique est conservé ; les contrôles ne sont plus suivis.</p>
          </form>
        </details>
      )}
    </>
  );
}
