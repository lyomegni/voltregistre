import Link from "next/link";
import { PLANS } from "@/lib/billing";

const FEATURES = [
  {
    title: "Inventaire électrique prêt à l'emploi",
    text: "TGBT, tableaux, transformateurs, variateurs, onduleurs, groupes électrogènes : chaque équipement arrive avec ses contrôles usuels et leur périodicité. Import Excel en quelques minutes.",
  },
  {
    title: "Alertes avant chaque échéance",
    text: "Un récapitulatif par e-mail à J-60, J-30 et J-7, puis une relance tant que le contrôle n'est pas fait. Fini les vérifications oubliées.",
  },
  {
    title: "Observations suivies jusqu'à leur levée",
    text: "Les observations du rapport de l'organisme de contrôle deviennent des actions, avec photo avant et après. Vous savez ce qui reste à corriger.",
  },
  {
    title: "Rapports terrain, même sans réseau",
    text: "Vos techniciens remplissent la checklist, prennent les photos et font signer sur leur téléphone, y compris au fond d'un local technique.",
  },
  {
    title: "Dossier de conformité en un clic",
    text: "Un PDF par site pour l'inspecteur du travail, l'assureur ou votre client : vérifications, rapports, observations et interventions.",
  },
  {
    title: "Pensé pour les prestataires",
    text: "Gérez les sites de tous vos clients dans un seul espace. Techniciens illimités, prix au site.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="font-display text-2xl font-bold">
            Volt<span className="text-volt-bright">Registre</span>
          </span>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#tarifs" className="hidden sm:inline">Tarifs</a>
            <Link href="/connexion" className="btn bg-volt-bright text-ink hover:bg-amber-400">Se connecter</Link>
          </nav>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
          <p className="font-mono text-xs uppercase tracking-widest text-volt-bright">Code du travail R4226-16 · arrêté du 26/12/2011 · Q18 / Q19</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl">
            Prouvez la conformité de vos installations électriques le jour où on vous la demande.
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            VoltRegistre suit la maintenance préventive et les vérifications réglementaires de vos tableaux, variateurs,
            onduleurs et groupes électrogènes. Pour les sites industriels et les entreprises de maintenance électrique.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/connexion" className="btn bg-volt-bright px-6 py-3 text-base text-ink hover:bg-amber-400">Essayer 14 jours gratuitement</Link>
            <a href="#fonctions" className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10">Voir les fonctions</a>
          </div>
        </div>
      </header>

      <section id="fonctions" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-semibold">Tout le registre électrique, au même endroit</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col gap-2">
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="text-sm text-slate-700">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tarifs" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-semibold">Tarifs au site, techniciens illimités</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div key={p.code} className="card flex flex-col gap-2">
                <h3 className="h2">{p.name}</h3>
                <p className="font-medium">{p.price}</p>
                <ul className="text-sm text-slate-700">{p.features.map((f) => <li key={f}>· {f}</li>)}</ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">Prix hors taxes, sans engagement.</p>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-500">
        VoltRegistre aide au suivi des contrôles. Il ne remplace pas les vérifications réalisées par un organisme accrédité ou une personne qualifiée.
      </footer>
    </div>
  );
}
