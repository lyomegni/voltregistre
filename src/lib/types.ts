export type Role = "admin" | "technicien" | "lecteur";
export type Plan = "essai" | "essentiel" | "pro" | "multisites" | "prestataire";

export type Organization = {
  id: string;
  name: string;
  kind: "industriel" | "prestataire";
  plan: Plan;
  trial_ends_at: string;
  subscription_status: string | null;
  stripe_customer_id: string | null;
};

export type Site = {
  id: string;
  org_id: string;
  name: string;
  client_name: string | null;
  address: string | null;
};

export type Equipment = {
  id: string;
  org_id: string;
  site_id: string;
  name: string;
  category: string;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  commissioned_on: string | null;
  rated_power: string | null;
  notes: string | null;
  qr_token: string;
  archived: boolean;
};

export type ControlPlan = {
  id: string;
  org_id: string;
  site_id: string;
  equipment_id: string | null;
  template_code: string | null;
  label: string;
  reference: string | null;
  periodicity_months: number;
  checklist: string[];
  first_due_on: string | null;
  last_done_on: string | null;
  next_due_on: string | null;
  active: boolean;
};

export type ChecklistAnswer = { label: string; ok: boolean | null; comment?: string };

export type Intervention = {
  id: string;
  org_id: string;
  site_id: string;
  control_plan_id: string | null;
  equipment_id: string | null;
  performed_on: string;
  technician_name: string | null;
  result: "conforme" | "reserves" | "non_conforme";
  checklist: ChecklistAnswer[];
  measures: string | null;
  comments: string | null;
  signed_by: string | null;
  signature_path: string | null;
};

export type InspectionReport = {
  id: string;
  org_id: string;
  site_id: string;
  control_plan_id: string | null;
  organism: string;
  inspected_on: string;
  received_on: string | null;
  file_path: string | null;
  notes: string | null;
};

export type Observation = {
  id: string;
  org_id: string;
  site_id: string;
  report_id: string | null;
  intervention_id: string | null;
  equipment_id: string | null;
  reference: string | null;
  description: string;
  severity: "mineure" | "majeure" | "critique";
  status: "ouverte" | "levee";
  due_on: string | null;
  photo_before_path: string | null;
  lifted_on: string | null;
  lifted_by: string | null;
  lift_comment: string | null;
  photo_after_path: string | null;
  created_at: string;
};

export const RESULT_LABELS: Record<Intervention["result"], string> = {
  conforme: "Conforme",
  reserves: "Avec réserves",
  non_conforme: "Non conforme",
};

export const SEVERITY_LABELS: Record<Observation["severity"], string> = {
  mineure: "Mineure",
  majeure: "Majeure",
  critique: "Critique",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  technicien: "Technicien",
  lecteur: "Lecture seule",
};
