import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { SiteDossier, type SiteDossierData } from "./site-dossier";
import { InterventionReport } from "./intervention-report";

const site = { id: "s1", org_id: "o1", name: "Usine de Vénissieux", client_name: "Fonderie Dupont", address: "12 rue de l'Industrie" };

const data: SiteDossierData = {
  orgName: "Électricité Martin",
  site,
  generatedOn: "2026-10-26",
  summary: { rate: 75, en_retard: 1, bientot: 1, a_jour: 2, a_planifier: 0, total: 4 },
  plans: [
    {
      id: "p1", org_id: "o1", site_id: "s1", equipment_id: null, template_code: "vpie",
      label: "Vérification périodique des installations électriques", reference: "Code du travail R4226-16",
      periodicity_months: 12, checklist: [], first_due_on: null, last_done_on: "2025-10-01", next_due_on: "2026-10-01",
      active: true, status: "en_retard", equipment: null, site,
    },
    {
      id: "p2", org_id: "o1", site_id: "s1", equipment_id: "e1", template_code: "thermographie",
      label: "Thermographie infrarouge (Q19)", reference: null, periodicity_months: 12, checklist: [],
      first_due_on: null, last_done_on: "2026-01-10", next_due_on: "2027-01-10", active: true, status: "a_jour",
      equipment: { id: "e1", name: "TGBT-01", category: "tgbt" }, site,
    },
  ],
  equipment: [
    { id: "e1", org_id: "o1", site_id: "s1", name: "TGBT-01", category: "tgbt", location: "Local TGBT", manufacturer: "Schneider", model: "Prisma", serial_number: null, commissioned_on: "2015-05-12", rated_power: "1600 A", notes: null, qr_token: "t", archived: false },
  ],
  reports: [{ id: "r1", org_id: "o1", site_id: "s1", control_plan_id: "p1", organism: "Apave", inspected_on: "2025-10-01", received_on: "2025-10-20", file_path: null, notes: null }],
  observations: [
    {
      id: "ob1", org_id: "o1", site_id: "s1", report_id: "r1", intervention_id: null, equipment_id: "e1", reference: "3.1",
      description: "Absence de protection mécanique des bornes", severity: "critique", status: "ouverte", due_on: "2026-11-30",
      photo_before_path: null, lifted_on: null, lifted_by: null, lift_comment: null, photo_after_path: null, created_at: "2025-10-20",
      equipment: { id: "e1", name: "TGBT-01" }, site, report: { id: "r1", organism: "Apave", inspected_on: "2025-10-01" },
    },
  ],
  interventions: [],
};

describe("PDF", () => {
  it("génère le dossier de conformité d'un site", async () => {
    const pdf = await renderToBuffer(<SiteDossier d={data} />);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  });

  it("génère un rapport d'intervention", async () => {
    const pdf = await renderToBuffer(
      <InterventionReport
        d={{
          orgName: "Électricité Martin",
          siteName: "Usine de Vénissieux",
          equipmentName: "TGBT-01",
          planLabel: "Maintenance préventive de tableau électrique",
          reference: null,
          signature: null,
          photos: [],
          intervention: {
            id: "i1", org_id: "o1", site_id: "s1", control_plan_id: "p1", equipment_id: "e1", performed_on: "2026-10-26",
            technician_name: "J. Martin", result: "reserves",
            checklist: [{ label: "Resserrage des connexions", ok: true }, { label: "Essai des différentiels", ok: false, comment: "DDR 30 mA départ 4 inopérant" }],
            measures: "Isolement : 250 MΩ", comments: null, signed_by: "M. Dupont", signature_path: null,
          },
        }}
      />,
    );
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
