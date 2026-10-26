import { describe, expect, it } from "vitest";
import {
  addMonths,
  alertForToday,
  complianceStatus,
  nextDueDate,
  summarize,
} from "./schedule";

describe("addMonths", () => {
  it("ajoute des mois simples", () => {
    expect(addMonths("2026-03-15", 12)).toBe("2027-03-15");
  });
  it("ramène au dernier jour du mois", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2027-12-31", 2)).toBe("2028-02-29");
  });
});

describe("nextDueDate", () => {
  it("part de la dernière réalisation", () => {
    expect(nextDueDate("2026-05-10", 12, "2026-01-01")).toBe("2027-05-10");
  });
  it("utilise la première échéance sans historique", () => {
    expect(nextDueDate(null, 12, "2026-11-01")).toBe("2026-11-01");
    expect(nextDueDate(null, 12, null)).toBeNull();
  });
});

describe("complianceStatus", () => {
  const today = "2026-10-26";
  it("classe les échéances", () => {
    expect(complianceStatus("2026-10-25", today)).toBe("en_retard");
    expect(complianceStatus("2026-10-26", today)).toBe("bientot");
    expect(complianceStatus("2026-12-25", today)).toBe("bientot");
    expect(complianceStatus("2026-12-26", today)).toBe("a_jour");
    expect(complianceStatus(null, today)).toBe("a_planifier");
  });
});

describe("alertForToday", () => {
  it("déclenche à J-60, J-30 et J-7", () => {
    expect(alertForToday("2026-12-25", "2026-10-26")).toBe(60);
    expect(alertForToday("2026-11-25", "2026-10-26")).toBe(30);
    expect(alertForToday("2026-11-02", "2026-10-26")).toBe(7);
    expect(alertForToday("2026-11-03", "2026-10-26")).toBeNull();
  });
  it("relance le lendemain de l'échéance puis chaque lundi", () => {
    expect(alertForToday("2026-10-25", "2026-10-26")).toBe("retard");
    expect(alertForToday("2026-10-01", "2026-10-26")).toBe("retard"); // lundi
    expect(alertForToday("2026-10-01", "2026-10-27")).toBeNull();
  });
});

describe("summarize", () => {
  it("calcule le taux de conformité sur les contrôles planifiés", () => {
    const s = summarize(["a_jour", "a_jour", "bientot", "en_retard", "a_planifier"]);
    expect(s.total).toBe(5);
    expect(s.rate).toBe(75);
  });
  it("renvoie null sans contrôle planifié", () => {
    expect(summarize([]).rate).toBeNull();
  });
});
