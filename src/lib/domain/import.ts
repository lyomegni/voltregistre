import { matchCategory, normalize, type EquipmentCategory } from "./categories";

export type ImportedEquipment = {
  name: string;
  category: EquipmentCategory;
  siteName: string | null;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  commissionedOn: string | null;
  ratedPower: string | null;
};

export type ImportResult = {
  rows: ImportedEquipment[];
  errors: { line: number; message: string }[];
};

type Field = keyof ImportedEquipment;

const HEADER_ALIASES: Record<Field, string[]> = {
  name: ["repere", "nom", "designation", "equipement", "libelle"],
  category: ["categorie", "type", "famille"],
  siteName: ["site", "etablissement", "batiment"],
  location: ["localisation", "emplacement", "local", "zone"],
  manufacturer: ["fabricant", "marque", "constructeur"],
  model: ["modele", "reference", "ref"],
  serialNumber: ["numero de serie", "n de serie", "serie", "sn", "num serie"],
  commissionedOn: ["mise en service", "date de mise en service", "date mes", "annee"],
  ratedPower: ["puissance", "calibre", "kva", "kw", "intensite"],
};

function mapHeaders(header: unknown[]): Partial<Record<Field, number>> {
  const map: Partial<Record<Field, number>> = {};
  header.forEach((cell, index) => {
    const h = normalize(String(cell ?? ""));
    if (!h) return;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [Field, string[]][]) {
      if (map[field] !== undefined) continue;
      if (aliases.some((a) => h === a || h.startsWith(a + " ") || h.endsWith(" " + a))) {
        map[field] = index;
        return;
      }
    }
  });
  return map;
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = (value instanceof Date ? value.toISOString().slice(0, 10) : String(value)).trim();
  return s === "" ? null : s;
}

/** Accepte JJ/MM/AAAA, AAAA-MM-JJ, une année seule ou une date Excel déjà convertie. */
export function parseFrenchDate(value: unknown): string | null | "invalid" {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = text(value);
  if (!s) return null;
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return iso(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{4})$/);
  if (m) return iso(+m[1], 1, 1);
  return "invalid";
}

function iso(y: number, mo: number, d: number): string | "invalid" {
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return "invalid";
  }
  return date.toISOString().slice(0, 10);
}

/** Transforme un tableau (1re ligne = en-têtes) en équipements à créer. */
export function parseEquipmentSheet(table: unknown[][]): ImportResult {
  const errors: ImportResult["errors"] = [];
  const rows: ImportedEquipment[] = [];
  if (table.length === 0) return { rows, errors: [{ line: 1, message: "Fichier vide" }] };

  const map = mapHeaders(table[0]);
  if (map.name === undefined) {
    errors.push({ line: 1, message: "Colonne « Repère » ou « Nom » introuvable" });
    return { rows, errors };
  }
  if (map.category === undefined) {
    errors.push({ line: 1, message: "Colonne « Catégorie » ou « Type » introuvable" });
    return { rows, errors };
  }

  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (f: Field) => (map[f] === undefined ? null : cells[map[f]!]);
    const name = text(get("name"));
    if (!name && cells.every((c) => text(c) === null)) return; // ligne vide
    if (!name) {
      errors.push({ line, message: "Repère manquant" });
      return;
    }
    const rawCategory = text(get("category")) ?? "";
    const category = matchCategory(rawCategory);
    if (!category) {
      errors.push({ line, message: `Catégorie non reconnue : « ${rawCategory} »` });
      return;
    }
    const commissionedOn = parseFrenchDate(get("commissionedOn"));
    if (commissionedOn === "invalid") {
      errors.push({ line, message: "Date de mise en service illisible (attendu JJ/MM/AAAA)" });
      return;
    }
    rows.push({
      name,
      category,
      siteName: text(get("siteName")),
      location: text(get("location")),
      manufacturer: text(get("manufacturer")),
      model: text(get("model")),
      serialNumber: text(get("serialNumber")),
      commissionedOn,
      ratedPower: text(get("ratedPower")),
    });
  });

  return { rows, errors };
}
