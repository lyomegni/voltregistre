export const EQUIPMENT_CATEGORIES = [
  { code: "tgbt", label: "TGBT (tableau général basse tension)" },
  { code: "tableau_divisionnaire", label: "Tableau divisionnaire" },
  { code: "transformateur", label: "Transformateur HTA/BT" },
  { code: "cellule_hta", label: "Cellule HTA" },
  { code: "variateur", label: "Variateur de vitesse" },
  { code: "onduleur", label: "Onduleur (ASI)" },
  { code: "batterie", label: "Batteries / parc de batteries" },
  { code: "groupe_electrogene", label: "Groupe électrogène" },
  { code: "batterie_condensateurs", label: "Batterie de condensateurs" },
  { code: "eclairage_securite", label: "Éclairage de sécurité" },
  { code: "irve", label: "Borne de recharge (IRVE)" },
  { code: "autre", label: "Autre équipement électrique" },
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]["code"];

export const CATEGORY_CODES = EQUIPMENT_CATEGORIES.map((c) => c.code) as [
  EquipmentCategory,
  ...EquipmentCategory[],
];

export function categoryLabel(code: string): string {
  return EQUIPMENT_CATEGORIES.find((c) => c.code === code)?.label ?? code;
}

/** Retrouve une catégorie à partir d'un libellé libre (import Excel). */
export function matchCategory(input: string): EquipmentCategory | null {
  const s = normalize(input);
  if (!s) return null;
  const direct = EQUIPMENT_CATEGORIES.find((c) => c.code === s.replace(/ /g, "_"));
  if (direct) return direct.code;
  const rules: [RegExp, EquipmentCategory][] = [
    [/tgbt|general basse tension/, "tgbt"],
    [/divisionnaire|tableau|armoire|coffret|td\b/, "tableau_divisionnaire"],
    [/transfo/, "transformateur"],
    [/hta|cellule/, "cellule_hta"],
    [/variateur|vfd|drive/, "variateur"],
    [/onduleur|asi|ups/, "onduleur"],
    [/condensateur/, "batterie_condensateurs"],
    [/batterie/, "batterie"],
    [/groupe|electrogene|ge\b/, "groupe_electrogene"],
    [/eclairage|baes|securite/, "eclairage_securite"],
    [/irve|borne|recharge/, "irve"],
  ];
  for (const [re, code] of rules) if (re.test(s)) return code;
  return null;
}

export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
