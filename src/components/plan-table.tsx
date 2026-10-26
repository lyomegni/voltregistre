import Link from "next/link";
import { StatusPill, formatDate } from "@/components/ui";
import { siteLabel, type PlanRow } from "@/lib/queries";
import { daysBetween, todayIso } from "@/lib/domain/schedule";

export function PlanTable({ plans, showSite = true }: { plans: PlanRow[]; showSite?: boolean }) {
  const today = todayIso();
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>État</th>
            <th>Contrôle</th>
            <th>Équipement</th>
            {showSite && <th>Site</th>}
            <th>Périodicité</th>
            <th>Dernier</th>
            <th>Échéance</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td><StatusPill status={p.status} /></td>
              <td className="font-medium">{p.label}</td>
              <td>
                {p.equipment ? (
                  <Link className="underline decoration-slate-300" href={`/app/equipements/${p.equipment.id}`}>
                    {p.equipment.name}
                  </Link>
                ) : (
                  <span className="text-slate-500">Site entier</span>
                )}
              </td>
              {showSite && (
                <td>
                  {p.site && (
                    <Link className="underline decoration-slate-300" href={`/app/sites/${p.site.id}`}>
                      {siteLabel(p.site)}
                    </Link>
                  )}
                </td>
              )}
              <td className="tabular-nums">{p.periodicity_months} mois</td>
              <td className="tabular-nums">{formatDate(p.last_done_on)}</td>
              <td className="tabular-nums">
                {formatDate(p.next_due_on)}
                {p.next_due_on && (
                  <span className="block text-xs text-slate-500">
                    {relative(daysBetween(today, p.next_due_on))}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function relative(days: number): string {
  if (days === 0) return "aujourd'hui";
  if (days < 0) return `retard de ${-days} j`;
  return `dans ${days} j`;
}
