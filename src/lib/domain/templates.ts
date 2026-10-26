import type { EquipmentCategory } from "./categories";

export type ControlTemplate = {
  code: string;
  label: string;
  /** Périodicité par défaut, en mois. */
  periodicityMonths: number;
  reference: string;
  /** Catégories auxquelles le plan est proposé par défaut. "site" = contrôle au niveau du site. */
  appliesTo: (EquipmentCategory | "site")[];
  checklist: string[];
};

/**
 * Bibliothèque de plans de contrôle proposés par défaut.
 * Les périodicités sont des valeurs usuelles : chaque client peut les ajuster.
 */
export const CONTROL_TEMPLATES: ControlTemplate[] = [
  {
    code: "vpie",
    label: "Vérification périodique des installations électriques",
    periodicityMonths: 12,
    reference: "Code du travail R4226-16, arrêté du 26/12/2011",
    appliesTo: ["site"],
    checklist: [
      "Rapport de l'organisme accrédité ou de la personne qualifiée reçu",
      "Observations reportées dans le registre",
      "Plan d'action de levée des observations établi",
    ],
  },
  {
    code: "thermographie",
    label: "Thermographie infrarouge (Q19)",
    periodicityMonths: 12,
    reference: "Référentiel APSAD D19, exigence assureur",
    appliesTo: ["tgbt", "tableau_divisionnaire", "transformateur", "batterie_condensateurs"],
    checklist: [
      "Équipement en charge (≥ 40 % de la charge nominale)",
      "Points chauds relevés et classés",
      "Thermogrammes joints au rapport",
    ],
  },
  {
    code: "maintenance_tableau",
    label: "Maintenance préventive de tableau électrique",
    periodicityMonths: 12,
    reference: "Préconisations constructeur, NF C 18-510 pour les consignations",
    appliesTo: ["tgbt", "tableau_divisionnaire"],
    checklist: [
      "Consignation réalisée et attestée",
      "Dépoussiérage",
      "Resserrage des connexions au couple",
      "Essai des dispositifs différentiels",
      "Contrôle visuel des protections et repérages",
    ],
  },
  {
    code: "maintenance_transformateur",
    label: "Maintenance de transformateur",
    periodicityMonths: 12,
    reference: "Préconisations constructeur",
    appliesTo: ["transformateur", "cellule_hta"],
    checklist: [
      "Contrôle du niveau et de l'aspect du diélectrique",
      "Relevé des températures",
      "Contrôle des protections (DGPT2, relais)",
      "Nettoyage des isolateurs",
    ],
  },
  {
    code: "maintenance_variateur",
    label: "Maintenance de variateur de vitesse",
    periodicityMonths: 12,
    reference: "Préconisations constructeur",
    appliesTo: ["variateur"],
    checklist: [
      "Nettoyage des filtres et radiateurs",
      "Contrôle des ventilateurs",
      "Relevé de l'historique des défauts",
      "Contrôle des condensateurs du bus continu",
    ],
  },
  {
    code: "maintenance_onduleur",
    label: "Maintenance d'onduleur (ASI)",
    periodicityMonths: 12,
    reference: "Préconisations constructeur",
    appliesTo: ["onduleur"],
    checklist: [
      "Relevé des alarmes et journaux",
      "Test de basculement sur batteries",
      "Contrôle des ventilateurs",
      "Mesure de l'autonomie",
    ],
  },
  {
    code: "test_batteries",
    label: "Contrôle des batteries",
    periodicityMonths: 6,
    reference: "Préconisations constructeur",
    appliesTo: ["batterie", "onduleur"],
    checklist: [
      "Mesure de la tension par bloc",
      "Mesure de la résistance interne",
      "Contrôle visuel (gonflement, fuite, corrosion)",
    ],
  },
  {
    code: "essai_groupe",
    label: "Essai du groupe électrogène",
    periodicityMonths: 1,
    reference: "Règlement de sécurité ERP (sources de sécurité), préconisations constructeur",
    appliesTo: ["groupe_electrogene"],
    checklist: [
      "Démarrage et prise de charge",
      "Relevé des niveaux (huile, liquide de refroidissement, carburant)",
      "Contrôle de la batterie de démarrage",
      "Consignation de l'essai dans le registre",
    ],
  },
  {
    code: "maintenance_groupe",
    label: "Maintenance annuelle du groupe électrogène",
    periodicityMonths: 12,
    reference: "Préconisations constructeur",
    appliesTo: ["groupe_electrogene"],
    checklist: [
      "Vidange et remplacement des filtres",
      "Contrôle des courroies et durites",
      "Essai en charge sur banc ou en réel",
    ],
  },
  {
    code: "eclairage_securite",
    label: "Contrôle de l'éclairage de sécurité",
    periodicityMonths: 6,
    reference: "Règlement de sécurité ERP / code du travail",
    appliesTo: ["eclairage_securite"],
    checklist: ["Essai de passage en position de sécurité", "Contrôle de l'autonomie"],
  },
  {
    code: "maintenance_irve",
    label: "Maintenance de borne de recharge",
    periodicityMonths: 12,
    reference: "Préconisations constructeur",
    appliesTo: ["irve"],
    checklist: ["Test du différentiel", "Contrôle des câbles et prises", "Mise à jour logicielle"],
  },
];

export function templateByCode(code: string): ControlTemplate | undefined {
  return CONTROL_TEMPLATES.find((t) => t.code === code);
}

export function templatesForCategory(category: EquipmentCategory): ControlTemplate[] {
  return CONTROL_TEMPLATES.filter((t) => t.appliesTo.includes(category));
}

export function siteTemplates(): ControlTemplate[] {
  return CONTROL_TEMPLATES.filter((t) => t.appliesTo.includes("site"));
}
