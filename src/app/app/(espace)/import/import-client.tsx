"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { readSheet } from "read-excel-file/browser";
import { parseEquipmentSheet, type ImportResult } from "@/lib/domain/import";
import { parseCsv } from "@/lib/domain/csv";
import { categoryLabel } from "@/lib/domain/categories";
import { importEquipment, type ImportOutcome } from "@/app/app/actions/import";
import type { Site } from "@/lib/types";

export function ImportClient({ sites }: { sites: Site[] }) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [addPlans, setAddPlans] = useState(true);
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    setResult(null);
    setOutcome(null);
    setReadError(null);
    if (!file) return;
    try {
      const table: unknown[][] = file.name.toLowerCase().endsWith(".csv")
        ? parseCsv(await file.text())
        : ((await readSheet(file)) as unknown[][]);
      setResult(parseEquipmentSheet(table));
    } catch {
      setReadError("Fichier illisible. Utilisez un fichier Excel (.xlsx) ou CSV.");
    }
  }

  function submit() {
    if (!result) return;
    start(async () => {
      setOutcome(await importEquipment({ rows: result.rows, defaultSiteId: siteId, addPlans }));
    });
  }

  if (outcome?.ok) {
    return (
      <div className="card flex flex-col gap-2">
        <p className="font-medium text-ok">
          {outcome.created} équipement{outcome.created > 1 ? "s" : ""} importé{outcome.created > 1 ? "s" : ""}
          {outcome.sitesCreated > 0 && `, ${outcome.sitesCreated} site(s) créé(s)`}.
        </p>
        <div className="flex gap-2">
          <Link href="/app/equipements" className="btn-primary">Voir les équipements</Link>
          <Link href="/app/echeancier?etat=a_planifier" className="btn-secondary">Planifier les contrôles</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <label htmlFor="file" className="label">Fichier Excel (.xlsx) ou CSV</label>
        <input id="file" type="file" accept=".xlsx,.csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
        {readError && <p className="text-sm text-risk">{readError}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="default-site" className="label">Site par défaut</label>
            <select id="default-site" value={siteId} onChange={(e) => setSiteId(e.target.value)} className="input">
              {sites.length === 0 && <option value="">Aucun site : la colonne « Site » est obligatoire</option>}
              {sites.map((s) => <option key={s.id} value={s.id}>{s.client_name ? `${s.client_name} · ${s.name}` : s.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">Utilisé quand la colonne « Site » est vide.</p>
          </div>
          <label className="flex items-start gap-2 text-sm sm:mt-6">
            <input type="checkbox" checked={addPlans} onChange={(e) => setAddPlans(e.target.checked)} className="mt-1" />
            Créer les contrôles usuels selon la catégorie (dates à compléter ensuite)
          </label>
        </div>
      </div>

      {result && (
        <>
          {result.errors.length > 0 && (
            <div className="card border-risk/40">
              <p className="mb-2 font-medium text-risk">{result.errors.length} ligne(s) ignorée(s)</p>
              <ul className="text-sm">
                {result.errors.slice(0, 20).map((e, n) => <li key={n}>Ligne {e.line} : {e.message}</li>)}
              </ul>
            </div>
          )}
          {result.rows.length > 0 && (
            <>
              <div className="table-wrap max-h-96 overflow-y-auto">
                <table className="table">
                  <thead><tr><th>Repère</th><th>Catégorie</th><th>Site</th><th>Localisation</th><th>Fabricant</th><th>Mise en service</th></tr></thead>
                  <tbody>
                    {result.rows.slice(0, 200).map((r, n) => (
                      <tr key={n}>
                        <td className="font-medium">{r.name}</td>
                        <td>{categoryLabel(r.category)}</td>
                        <td>{r.siteName ?? <span className="text-slate-400">par défaut</span>}</td>
                        <td>{r.location ?? "—"}</td>
                        <td>{r.manufacturer ?? "—"}</td>
                        <td className="tabular-nums">{r.commissionedOn ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {outcome && !outcome.ok && <p className="text-sm text-risk">{outcome.error}</p>}
              <div>
                <button type="button" onClick={submit} disabled={pending} className="btn-primary">
                  {pending ? "Import en cours…" : `Importer ${result.rows.length} équipement${result.rows.length > 1 ? "s" : ""}`}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
