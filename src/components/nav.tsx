"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Tableau de bord" },
  { href: "/app/echeancier", label: "Échéancier" },
  { href: "/app/sites", label: "Sites" },
  { href: "/app/equipements", label: "Équipements" },
  { href: "/app/observations", label: "Observations" },
  { href: "/app/rapports", label: "Rapports de contrôle" },
  { href: "/app/interventions", label: "Interventions" },
  { href: "/app/import", label: "Import Excel" },
];

const ADMIN_LINKS = [
  { href: "/app/equipe", label: "Équipe" },
  { href: "/app/abonnement", label: "Abonnement" },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const links = isAdmin ? [...LINKS, ...ADMIN_LINKS] : LINKS;
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto md:flex-col">
      {links.map((l) => {
        const active = l.href === "/app" ? path === "/app" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded px-3 py-1.5 text-sm ${
              active ? "bg-white/10 font-medium text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
