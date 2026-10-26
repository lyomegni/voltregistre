import Link from "next/link";
import { Pill, formatDate } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { liftObservation, reopenObservation } from "@/app/app/actions/observations";
import { siteLabel, type ObservationRow } from "@/lib/queries";
import { SEVERITY_LABELS } from "@/lib/types";
import { todayIso } from "@/lib/domain/schedule";

const SEVERITY_TONE = { mineure: "neutral", majeure: "warn", critique: "risk" } as const;

export function ObservationList({
  observations,
  canEdit,
  back,
  showSite = true,
}: {
  observations: ObservationRow[];
  canEdit: boolean;
  back: string;
  showSite?: boolean;
}) {
  if (observations.length === 0) {
    return <p className="text-sm text-slate-600">Aucune observation.</p>;
  }
  const today = todayIso();
  return (
    <ul className="flex flex-col gap-2">
      {observations.map((o) => {
        const late = o.status === "ouverte" && o.due_on && o.due_on < today;
        return (
          <li key={o.id} className="card flex flex-col gap-2 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Pill tone={SEVERITY_TONE[o.severity]}>{SEVERITY_LABELS[o.severity]}</Pill>
              {o.status === "levee" ? <Pill tone="ok">Levée le {formatDate(o.lifted_on)}</Pill> : <Pill tone={late ? "risk" : "neutral"}>{late ? "Délai dépassé" : "Ouverte"}</Pill>}
              {o.reference && <span className="font-mono text-xs text-slate-500">{o.reference}</span>}
              {o.due_on && o.status === "ouverte" && <span className="text-xs text-slate-500">à lever avant le {formatDate(o.due_on)}</span>}
            </div>
            <p className="text-sm">{o.description}</p>
            <p className="text-xs text-slate-500">
              {[
                showSite ? siteLabel(o.site) : null,
                o.equipment?.name,
                o.report ? `${o.report.organism}, ${formatDate(o.report.inspected_on)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              {o.report && <> · <Link href={`/app/rapports/${o.report.id}`} className="underline">rapport</Link></>}
            </p>
            {o.status === "levee" && o.lift_comment && <p className="text-xs text-ok">Correction : {o.lift_comment}</p>}
            {canEdit && o.status === "ouverte" && (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-ok">Lever l&apos;observation</summary>
                <form action={liftObservation} className="mt-2 grid gap-2 sm:grid-cols-4 sm:items-end">
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="back" value={back} />
                  <div>
                    <label className="label" htmlFor={`lo-${o.id}`}>Date</label>
                    <input id={`lo-${o.id}`} name="lifted_on" type="date" defaultValue={today} className="input" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor={`lc-${o.id}`}>Correction réalisée</label>
                    <input id={`lc-${o.id}`} name="lift_comment" required className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor={`lp-${o.id}`}>Photo après</label>
                    <input id={`lp-${o.id}`} name="photo_after" type="file" accept="image/*" capture="environment" className="text-xs" />
                  </div>
                  <div><SubmitButton className="btn-secondary">Valider la levée</SubmitButton></div>
                </form>
              </details>
            )}
            {canEdit && o.status === "levee" && (
              <form action={reopenObservation}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="back" value={back} />
                <button type="submit" className="text-xs text-slate-500 underline">Rouvrir</button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
