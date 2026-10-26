import Link from "next/link";
import { SyncBadge } from "./sync-badge";

export const metadata = { title: "Terrain" };

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f6f4]">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-ink px-4 py-3 text-white">
        <Link href="/terrain" className="font-display text-xl font-bold">
          Volt<span className="text-volt-bright">Registre</span> <span className="text-sm font-normal text-slate-300">terrain</span>
        </Link>
        <SyncBadge />
      </header>
      <main className="mx-auto max-w-xl px-4 py-4">{children}</main>
    </div>
  );
}
