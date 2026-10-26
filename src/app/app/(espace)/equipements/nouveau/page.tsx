import Link from "next/link";
import { getContext } from "@/lib/context";
import { loadSites } from "@/lib/queries";
import { BackLink, EmptyState, Notice, PageHeader } from "@/components/ui";
import { EquipmentForm } from "@/components/equipment-form";
import { createEquipment } from "@/app/app/actions/equipment";

export const metadata = { title: "Nouvel équipement" };

export default async function NewEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; erreur?: string }>;
}) {
  const ctx = await getContext();
  const { site, erreur } = await searchParams;
  const sites = await loadSites(ctx);
  return (
    <>
      <BackLink href="/app/equipements">Équipements</BackLink>
      <PageHeader title="Nouvel équipement" />
      {erreur && <div className="mb-4"><Notice tone="error">{erreur}</Notice></div>}
      {sites.length === 0 ? (
        <EmptyState title="Créez d'abord un site" action={<Link href="/app/sites?nouveau=1" className="btn-primary">Créer un site</Link>} />
      ) : (
        <div className="card max-w-3xl">
          <EquipmentForm action={createEquipment} sites={sites} defaultSiteId={site} />
        </div>
      )}
    </>
  );
}
