import { getContext } from "@/lib/context";
import { loadSites } from "@/lib/queries";
import { Notice, PageHeader } from "@/components/ui";
import { EQUIPMENT_CATEGORIES } from "@/lib/domain/categories";
import { ImportClient } from "./import-client";

export const metadata = { title: "Import Excel" };

export default async function ImportPage() {
  const ctx = await getContext();
  const sites = await loadSites(ctx);
  return (
    <>
      <PageHeader title="Importer votre inventaire" subtitle="Reprenez votre tableau Excel existant en quelques minutes." />
      {!ctx.canEdit ? (
        <Notice tone="error">Votre rôle ne permet pas d&apos;importer des équipements.</Notice>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <ImportClient sites={sites} />
          <aside className="card text-sm">
            <h2 className="h2 mb-2">Colonnes reconnues</h2>
            <ul className="flex flex-col gap-1">
              <li><b>Repère</b> ou Nom (obligatoire)</li>
              <li><b>Catégorie</b> ou Type (obligatoire)</li>
              <li>Site, Localisation</li>
              <li>Fabricant ou Marque, Modèle</li>
              <li>N° de série, Puissance</li>
              <li>Date de mise en service (JJ/MM/AAAA)</li>
            </ul>
            <h3 className="label mt-4">Catégories</h3>
            <p className="text-xs text-slate-600">{EQUIPMENT_CATEGORIES.map((c) => c.label).join(" · ")}</p>
            <p className="mt-2 text-xs text-slate-600">Les libellés proches sont reconnus : « ASI » ou « UPS » pour un onduleur, « GE » pour un groupe électrogène, « armoire » pour un tableau.</p>
          </aside>
        </div>
      )}
    </>
  );
}
