import { notFound } from "next/navigation";
import { getContext } from "@/lib/context";
import { loadPlans, siteLabel } from "@/lib/queries";
import { categoryLabel } from "@/lib/domain/categories";
import { InterventionForm } from "./intervention-form";

export default async function FieldInterventionPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const ctx = await getContext();
  const plan = (await loadPlans(ctx)).find((p) => p.id === planId);
  if (!plan) notFound();
  if (!ctx.canEdit) {
    return <p className="card text-sm">Votre rôle (lecture seule) ne permet pas de saisir une intervention.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-slate-600">{siteLabel(plan.site)}</p>
        <h1 className="h1">{plan.equipment?.name ?? "Site entier"}</h1>
        {plan.equipment && <p className="text-sm text-slate-600">{categoryLabel(plan.equipment.category)}</p>}
        <p className="mt-1 font-medium">{plan.label}</p>
        {plan.reference && <p className="font-mono text-[11px] text-slate-500">{plan.reference}</p>}
      </div>
      <InterventionForm
        planId={plan.id}
        label={`${plan.equipment?.name ?? siteLabel(plan.site)} · ${plan.label}`}
        checklist={plan.checklist}
        technician={ctx.user.email ?? ""}
      />
    </div>
  );
}
