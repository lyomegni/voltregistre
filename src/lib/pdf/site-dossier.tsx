import { Document, Page, Text, View } from "@react-pdf/renderer";
import { COLORS, s } from "./styles";
import { STATUS_LABELS, type ComplianceStatus } from "@/lib/domain/schedule";
import { categoryLabel } from "@/lib/domain/categories";
import { RESULT_LABELS, SEVERITY_LABELS, type Equipment, type InspectionReport, type Intervention, type Site } from "@/lib/types";
import type { ObservationRow, PlanRow } from "@/lib/queries";

const STATUS_COLOR: Record<ComplianceStatus, string> = {
  en_retard: COLORS.risk,
  bientot: COLORS.warn,
  a_jour: COLORS.ok,
  a_planifier: COLORS.muted,
};

function fr(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export type SiteDossierData = {
  orgName: string;
  site: Site;
  generatedOn: string;
  summary: { rate: number | null; en_retard: number; bientot: number; a_jour: number; a_planifier: number; total: number };
  plans: PlanRow[];
  equipment: Equipment[];
  reports: InspectionReport[];
  observations: ObservationRow[];
  interventions: (Intervention & { plan_label: string | null; equipment_name: string | null })[];
};

function Table({ cols, rows }: { cols: { label: string; width: string }[]; rows: (string | { text: string; color?: string })[][] }) {
  return (
    <View>
      <View style={s.head} fixed>
        {cols.map((c) => (
          <Text key={c.label} style={[s.cell, { width: c.width }]}>{c.label.toUpperCase()}</Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={s.row} wrap={false}>
          {r.map((v, j) => {
            const t = typeof v === "string" ? { text: v } : v;
            return (
              <Text key={j} style={[s.cell, { width: cols[j].width }, t.color ? { color: t.color, fontFamily: "Helvetica-Bold" } : {}]}>
                {t.text}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function SiteDossier({ d }: { d: SiteDossierData }) {
  const sitePlans = d.plans.filter((p) => !p.equipment_id);
  const open = d.observations.filter((o) => o.status === "ouverte");
  const lifted = d.observations.filter((o) => o.status === "levee");
  return (
    <Document title={`Dossier de conformité ${d.site.name}`} author="VoltRegistre" language="fr">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>VOLTREGISTRE · DOSSIER DE CONFORMITÉ ÉLECTRIQUE</Text>
        <Text style={s.h1}>{d.site.name}</Text>
        <Text style={s.muted}>
          {[d.site.client_name, d.site.address].filter(Boolean).join(" · ")}
          {"\n"}Établi par {d.orgName} le {fr(d.generatedOn)}
        </Text>

        <View style={s.stats}>
          <View style={s.stat}>
            <Text style={s.small}>TAUX DE CONFORMITÉ</Text>
            <Text style={s.statValue}>{d.summary.rate === null ? "—" : `${d.summary.rate} %`}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.small}>CONTRÔLES EN RETARD</Text>
            <Text style={[s.statValue, { color: d.summary.en_retard ? COLORS.risk : COLORS.ok }]}>{d.summary.en_retard}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.small}>SOUS 60 JOURS</Text>
            <Text style={s.statValue}>{d.summary.bientot}</Text>
          </View>
          <View style={[s.stat, { borderRightWidth: 0 }]}>
            <Text style={s.small}>OBSERVATIONS À LEVER</Text>
            <Text style={[s.statValue, { color: open.length ? COLORS.warn : COLORS.ok }]}>{open.length}</Text>
          </View>
        </View>

        <Text style={s.h2}>Vérifications réglementaires du site</Text>
        {sitePlans.length === 0 ? (
          <Text style={s.muted}>Aucune vérification suivie au niveau du site.</Text>
        ) : (
          <Table
            cols={[{ label: "Contrôle", width: "38%" }, { label: "Référence", width: "26%" }, { label: "Dernier", width: "12%" }, { label: "Échéance", width: "12%" }, { label: "État", width: "12%" }]}
            rows={sitePlans.map((p) => [p.label, p.reference ?? "", fr(p.last_done_on), fr(p.next_due_on), { text: STATUS_LABELS[p.status], color: STATUS_COLOR[p.status] }])}
          />
        )}

        <Text style={s.h2}>Rapports des organismes de contrôle</Text>
        {d.reports.length === 0 ? (
          <Text style={s.muted}>Aucun rapport enregistré.</Text>
        ) : (
          <Table
            cols={[{ label: "Date de vérification", width: "25%" }, { label: "Organisme", width: "35%" }, { label: "Reçu le", width: "20%" }, { label: "Observations", width: "20%" }]}
            rows={d.reports.map((r) => {
              const obs = d.observations.filter((o) => o.report_id === r.id);
              return [fr(r.inspected_on), r.organism, fr(r.received_on), `${obs.length} (${obs.filter((o) => o.status === "ouverte").length} à lever)`];
            })}
          />
        )}

        <Text style={s.h2}>Équipements et contrôles ({d.equipment.length} équipements)</Text>
        <Table
          cols={[{ label: "Repère", width: "16%" }, { label: "Catégorie", width: "20%" }, { label: "Contrôle", width: "28%" }, { label: "Dernier", width: "12%" }, { label: "Échéance", width: "12%" }, { label: "État", width: "12%" }]}
          rows={d.equipment.flatMap((e) => {
            const ep = d.plans.filter((p) => p.equipment_id === e.id);
            if (ep.length === 0) return [[e.name, categoryLabel(e.category), "Aucun contrôle suivi", "—", "—", ""]];
            return ep.map((p, i) => [i === 0 ? e.name : "", i === 0 ? categoryLabel(e.category) : "", p.label, fr(p.last_done_on), fr(p.next_due_on), { text: STATUS_LABELS[p.status], color: STATUS_COLOR[p.status] }]);
          })}
        />

        <Text style={s.h2} break={open.length > 8}>Observations à lever ({open.length})</Text>
        {open.length === 0 ? (
          <Text style={s.muted}>Aucune observation en attente de levée.</Text>
        ) : (
          <Table
            cols={[{ label: "Réf.", width: "8%" }, { label: "Observation", width: "46%" }, { label: "Équipement", width: "14%" }, { label: "Gravité", width: "10%" }, { label: "Origine", width: "12%" }, { label: "À lever", width: "10%" }]}
            rows={open.map((o) => [o.reference ?? "", o.description, o.equipment?.name ?? "", { text: SEVERITY_LABELS[o.severity], color: o.severity === "critique" ? COLORS.risk : undefined }, o.report ? o.report.organism : "Intervention", fr(o.due_on)])}
          />
        )}

        <Text style={s.h2}>Observations levées sur 12 mois ({lifted.length})</Text>
        {lifted.length === 0 ? (
          <Text style={s.muted}>Aucune.</Text>
        ) : (
          <Table
            cols={[{ label: "Réf.", width: "8%" }, { label: "Observation", width: "40%" }, { label: "Correction", width: "32%" }, { label: "Levée le", width: "20%" }]}
            rows={lifted.map((o) => [o.reference ?? "", o.description, o.lift_comment ?? "", `${fr(o.lifted_on)}${o.lifted_by ? `\n${o.lifted_by}` : ""}`])}
          />
        )}

        <Text style={s.h2}>Interventions des 12 derniers mois ({d.interventions.length})</Text>
        {d.interventions.length === 0 ? (
          <Text style={s.muted}>Aucune intervention enregistrée.</Text>
        ) : (
          <Table
            cols={[{ label: "Date", width: "12%" }, { label: "Contrôle", width: "34%" }, { label: "Équipement", width: "18%" }, { label: "Résultat", width: "16%" }, { label: "Technicien", width: "20%" }]}
            rows={d.interventions.map((i) => [fr(i.performed_on), i.plan_label ?? "", i.equipment_name ?? "Site", { text: RESULT_LABELS[i.result], color: i.result === "conforme" ? COLORS.ok : i.result === "reserves" ? COLORS.warn : COLORS.risk }, i.technician_name ?? ""])}
          />
        )}

        <Text style={[s.small, { marginTop: 18 }]}>
          Ce dossier récapitule le suivi des contrôles et de la maintenance enregistré dans VoltRegistre. Il ne remplace pas les rapports
          de vérification établis par l&apos;organisme accrédité ou la personne qualifiée (code du travail, art. R4226-16 et R4226-19),
          qui doivent être conservés et tenus à disposition de l&apos;inspection du travail.
        </Text>

        <View style={s.footer} fixed>
          <Text>{d.site.name} · {d.orgName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
