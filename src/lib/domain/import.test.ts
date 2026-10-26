import { describe, expect, it } from "vitest";
import { parseEquipmentSheet, parseFrenchDate } from "./import";
import { matchCategory } from "./categories";

describe("matchCategory", () => {
  it("reconnaît les libellés courants", () => {
    expect(matchCategory("TGBT")).toBe("tgbt");
    expect(matchCategory("Onduleur 20 kVA")).toBe("onduleur");
    expect(matchCategory("Groupe électrogène")).toBe("groupe_electrogene");
    expect(matchCategory("Armoire divisionnaire atelier")).toBe("tableau_divisionnaire");
    expect(matchCategory("Variateur ATV930")).toBe("variateur");
    expect(matchCategory("Batterie de condensateurs")).toBe("batterie_condensateurs");
    expect(matchCategory("pompe")).toBeNull();
  });
});

describe("parseFrenchDate", () => {
  it("lit les formats usuels", () => {
    expect(parseFrenchDate("15/03/2019")).toBe("2019-03-15");
    expect(parseFrenchDate("2019-03-15")).toBe("2019-03-15");
    expect(parseFrenchDate("2019")).toBe("2019-01-01");
    expect(parseFrenchDate("")).toBeNull();
    expect(parseFrenchDate("31/02/2019")).toBe("invalid");
  });
});

describe("parseEquipmentSheet", () => {
  it("importe les lignes valides et signale les erreurs", () => {
    const result = parseEquipmentSheet([
      ["Repère", "Catégorie", "Site", "Marque", "Date de mise en service"],
      ["TGBT-01", "TGBT", "Usine Lyon", "Schneider", "12/05/2015"],
      ["", "", "", "", ""],
      ["ASI-02", "Onduleur", "Usine Lyon", "Eaton", "2020"],
      ["X-03", "Pompe", "Usine Lyon", "", ""],
      ["", "TGBT", "", "", ""],
    ]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      name: "TGBT-01",
      category: "tgbt",
      siteName: "Usine Lyon",
      manufacturer: "Schneider",
      commissionedOn: "2015-05-12",
    });
    expect(result.errors).toEqual([
      { line: 5, message: "Catégorie non reconnue : « Pompe »" },
      { line: 6, message: "Repère manquant" },
    ]);
  });
  it("exige les colonnes obligatoires", () => {
    expect(parseEquipmentSheet([["Site"]]).errors[0].message).toMatch(/Repère/);
  });
});
