import { CONTROL_TEMPLATES } from "@/lib/domain/templates";
import { StatusPill, formatDate } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { addPlan, deactivatePlan, updatePlan } from "@/app/app/actions/plans";
import type { PlanRow } from "@/lib/queries";

/** Liste des contrôles d'un équipement ou d'un site, avec modification et ajout. */
export function PlanEditor({
  plans,
  siteId,
  equipmentId,
  back,
  canEdit,
}: {
  plans: PlanRow[];
  siteId: string;
  equipmentId?: string;
  back: string;
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {plans.length === 0 && <p className="text-sm text-slate-600">Aucun contrôle suivi pour l&apos;instant.</p>}
      {plans.map((p) => (
        <details key={p.id} className="card p-0">
          <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3">
            <StatusPill status={p.status} />
            <span className="font-medium">{p.label}</span>
            <span className="text-sm text-slate-600">
              tous les {p.periodicity_months} mois · échéance {formatDate(p.next_due_on)}
            </span>
          </summary>
          <div className="border-t border-slate-100 px-4 py-3 text-sm">
            {p.reference && <p className="mb-2 font-mono text-xs text-slate-500">{p.reference}</p>}
            {canEdit ? (
              <div className="flex flex-col gap-3">
                <form action={updatePlan} className="grid gap-3 sm:grid-cols-4 sm:items-end">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="back" value={back} />
                  <div>
                    <label className="label" htmlFor={`per-${p.id}`}>Périodicité (mois)</label>
                    <input id={`per-${p.id}`} name="periodicity_months" type="number" min={1} max={120} defaultValue={p.periodicity_months} className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor={`last-${p.id}`}>Dernière réalisation</label>
                    <input id={`last-${p.id}`} name="last_done_on" type="date" defaultValue={p.last_done_on ?? ""} className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor={`first-${p.id}`}>1re échéance (sans historique)</label>
                    <input id={`first-${p.id}`} name="first_due_on" type="date" defaultValue={p.first_due_on ?? ""} className="input" />
                  </div>
                  <SubmitButton className="btn-secondary">Mettre à jour</SubmitButton>
                </form>
                <form action={deactivatePlan}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="text-xs text-risk underline">Ne plus suivre ce contrôle</button>
                </form>
              </div>
            ) : (
              <p>Dernière réalisation : {formatDate(p.last_done_on)}</p>
            )}
          </div>
        </details>
      ))}
      {canEdit && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium">+ Ajouter un contrôle</summary>
          <form action={addPlan} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="site_id" value={siteId} />
            {equipmentId && <input type="hidden" name="equipment_id" value={equipmentId} />}
            <input type="hidden" name="back" value={back} />
            <div className="sm:col-span-2">
              <label className="label" htmlFor="template_code">Modèle</label>
              <select id="template_code" name="template_code" className="input" defaultValue="">
                <option value="">Choisir…</option>
                {CONTROL_TEMPLATES.map((t) => (
                  <option key={t.code} value={t.code}>{t.label} ({t.periodicityMonths} mois)</option>
                ))}
                <option value="autre">Autre contrôle (personnalisé)</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="label">Nom (si personnalisé)</label>
              <input id="label" name="label" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="periodicity_months">Périodicité en mois (optionnel)</label>
              <input id="periodicity_months" name="periodicity_months" type="number" min={1} max={120} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="last_done_on">Dernière réalisation</label>
              <input id="last_done_on" name="last_done_on" type="date" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="first_due_on">Ou 1re échéance</label>
              <input id="first_due_on" name="first_due_on" type="date" className="input" />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>Ajouter</SubmitButton>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
