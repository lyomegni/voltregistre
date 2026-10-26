"use client";

import { useState } from "react";
import { EQUIPMENT_CATEGORIES, type EquipmentCategory } from "@/lib/domain/categories";
import { CONTROL_TEMPLATES } from "@/lib/domain/templates";
import type { Equipment, Site } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";

export function EquipmentForm({
  action,
  sites,
  equipment,
  defaultSiteId,
}: {
  action: (form: FormData) => Promise<void>;
  sites: Site[];
  equipment?: Equipment;
  defaultSiteId?: string;
}) {
  const [category, setCategory] = useState<EquipmentCategory>(
    (equipment?.category as EquipmentCategory) ?? "tgbt",
  );
  const isNew = !equipment;
  const suggested = CONTROL_TEMPLATES.filter((t) => t.appliesTo.includes(category));

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {equipment && <input type="hidden" name="id" value={equipment.id} />}
      <div>
        <label className="label" htmlFor="name">Repère</label>
        <input id="name" name="name" required defaultValue={equipment?.name} className="input" placeholder="Ex. TGBT-01" />
      </div>
      <div>
        <label className="label" htmlFor="category">Catégorie</label>
        <select
          id="category"
          name="category"
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
        >
          {EQUIPMENT_CATEGORIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="site_id">Site</label>
        <select id="site_id" name="site_id" className="input" defaultValue={equipment?.site_id ?? defaultSiteId ?? sites[0]?.id}>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.client_name ? `${s.client_name} · ${s.name}` : s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="location">Localisation</label>
        <input id="location" name="location" defaultValue={equipment?.location ?? ""} className="input" placeholder="Ex. Local TGBT, bâtiment B" />
      </div>
      <div>
        <label className="label" htmlFor="manufacturer">Fabricant</label>
        <input id="manufacturer" name="manufacturer" defaultValue={equipment?.manufacturer ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="model">Modèle / référence</label>
        <input id="model" name="model" defaultValue={equipment?.model ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="serial_number">N° de série</label>
        <input id="serial_number" name="serial_number" defaultValue={equipment?.serial_number ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="rated_power">Puissance / calibre</label>
        <input id="rated_power" name="rated_power" defaultValue={equipment?.rated_power ?? ""} className="input" placeholder="Ex. 1600 A, 40 kVA" />
      </div>
      <div>
        <label className="label" htmlFor="commissioned_on">Mise en service</label>
        <input id="commissioned_on" name="commissioned_on" type="date" defaultValue={equipment?.commissioned_on ?? ""} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={equipment?.notes ?? ""} className="input" />
      </div>

      {isNew && (
        <fieldset className="sm:col-span-2 rounded border border-slate-200 p-4">
          <legend className="label px-1">Contrôles à suivre</legend>
          {suggested.length === 0 ? (
            <p className="text-sm text-slate-600">Aucun modèle prévu pour cette catégorie. Vous pourrez ajouter un contrôle personnalisé ensuite.</p>
          ) : (
            <div className="flex flex-col gap-2" key={category}>
              {suggested.map((t) => (
                <label key={t.code} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="templates" value={t.code} defaultChecked className="mt-1" />
                  <span>
                    {t.label} <span className="text-slate-500">· tous les {t.periodicityMonths} mois</span>
                    <span className="block font-mono text-[11px] text-slate-500">{t.reference}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-3 max-w-xs">
            <label className="label" htmlFor="first_due">Première échéance</label>
            <input id="first_due" name="first_due" type="date" className="input" />
            <p className="mt-1 text-xs text-slate-500">Laissez vide si vous ne la connaissez pas encore.</p>
          </div>
        </fieldset>
      )}

      <div className="sm:col-span-2">
        <SubmitButton>{isNew ? "Créer l'équipement" : "Enregistrer"}</SubmitButton>
      </div>
    </form>
  );
}
