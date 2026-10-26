import { ALERT_THRESHOLDS } from "./schedule";

export type DigestItem = {
  planId: string;
  label: string;
  equipmentName: string | null;
  siteName: string;
  dueOn: string;
  alert: (typeof ALERT_THRESHOLDS)[number] | "retard";
};

function fr(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const GROUPS: { key: DigestItem["alert"]; title: string; color: string }[] = [
  { key: "retard", title: "En retard", color: "#b3362c" },
  { key: 7, title: "Dans 7 jours", color: "#a35b00" },
  { key: 30, title: "Dans 30 jours", color: "#a35b00" },
  { key: 60, title: "Dans 60 jours", color: "#17232b" },
];

/** E-mail récapitulatif quotidien d'une organisation. */
export function buildDigest(orgName: string, items: DigestItem[], appUrl: string) {
  const late = items.filter((i) => i.alert === "retard").length;
  const subject =
    late > 0
      ? `${late} contrôle${late > 1 ? "s" : ""} en retard · ${orgName}`
      : `${items.length} contrôle${items.length > 1 ? "s" : ""} à planifier · ${orgName}`;
  const sections = GROUPS.map((g) => {
    const list = items.filter((i) => i.alert === g.key);
    if (list.length === 0) return "";
    const rows = list
      .map(
        (i) =>
          `<tr><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb">${esc(i.label)}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb">${esc(i.equipmentName ?? "Site entier")}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb">${esc(i.siteName)}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;white-space:nowrap">${fr(i.dueOn)}</td></tr>`,
      )
      .join("");
    return `<h3 style="color:${g.color};font-family:Arial,sans-serif;margin:20px 0 6px">${g.title} (${list.length})</h3><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;width:100%">${rows}</table>`;
  }).join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#17232b;max-width:640px"><p style="font-weight:bold;color:#b86a00;letter-spacing:1px">VOLTREGISTRE</p><p>Bonjour,</p><p>Voici les échéances de contrôle à surveiller pour <b>${esc(orgName)}</b>.</p>${sections}<p style="margin-top:24px"><a href="${appUrl}/app/echeancier" style="background:#17232b;color:#fff;padding:10px 16px;text-decoration:none;border-radius:4px">Ouvrir l'échéancier</a></p><p style="font-size:12px;color:#55636c;margin-top:24px">Vous recevez cet e-mail car les alertes sont activées sur votre compte. Vous pouvez les désactiver dans la page Équipe.</p></div>`;
  return { subject, html };
}
