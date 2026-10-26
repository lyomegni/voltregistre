/** Dates manipulées au format ISO "AAAA-MM-JJ", sans fuseau horaire. */

export type ComplianceStatus = "en_retard" | "bientot" | "a_jour" | "a_planifier";

export const SOON_WINDOW_DAYS = 60;
export const ALERT_THRESHOLDS = [60, 30, 7] as const;

export function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayIso(now: Date = new Date()): string {
  return formatDay(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/** Ajoute des mois en ramenant au dernier jour du mois si besoin (31 janv. + 1 mois = 28/29 févr.). */
export function addMonths(iso: string, months: number): string {
  const d = parseDay(iso);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return formatDay(target);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDay(toIso).getTime() - parseDay(fromIso).getTime()) / 86_400_000);
}

/** Prochaine échéance : dernière réalisation + périodicité, sinon la date de départ choisie. */
export function nextDueDate(
  lastDoneOn: string | null,
  periodicityMonths: number,
  firstDueOn: string | null,
): string | null {
  if (lastDoneOn) return addMonths(lastDoneOn, periodicityMonths);
  return firstDueOn;
}

export function complianceStatus(nextDueOn: string | null, today: string): ComplianceStatus {
  if (!nextDueOn) return "a_planifier";
  const days = daysBetween(today, nextDueOn);
  if (days < 0) return "en_retard";
  if (days <= SOON_WINDOW_DAYS) return "bientot";
  return "a_jour";
}

/**
 * Seuil d'alerte atteint aujourd'hui, ou null.
 * Renvoie 60, 30 ou 7 le jour exact du seuil, et "retard" le lendemain de l'échéance
 * puis chaque lundi tant que le contrôle n'est pas réalisé.
 */
export function alertForToday(
  nextDueOn: string | null,
  today: string,
): (typeof ALERT_THRESHOLDS)[number] | "retard" | null {
  if (!nextDueOn) return null;
  const days = daysBetween(today, nextDueOn);
  for (const t of ALERT_THRESHOLDS) if (days === t) return t;
  if (days === -1) return "retard";
  if (days < -1 && parseDay(today).getUTCDay() === 1) return "retard";
  return null;
}

export const STATUS_LABELS: Record<ComplianceStatus, string> = {
  en_retard: "En retard",
  bientot: "Bientôt",
  a_jour: "À jour",
  a_planifier: "À planifier",
};

export function summarize(statuses: ComplianceStatus[]) {
  const counts = { en_retard: 0, bientot: 0, a_jour: 0, a_planifier: 0 };
  for (const s of statuses) counts[s]++;
  const planned = statuses.length - counts.a_planifier;
  const rate = planned === 0 ? null : Math.round(((planned - counts.en_retard) / planned) * 100);
  return { ...counts, total: statuses.length, rate };
}
