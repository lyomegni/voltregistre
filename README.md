# VoltRegistre

SaaS de maintenance préventive et de suivi de la conformité réglementaire des petites installations électriques industrielles : TGBT, tableaux, transformateurs, variateurs, onduleurs, groupes électrogènes.

Cibles : PME industrielles (1 à 10 sites) et entreprises de maintenance électrique qui gèrent les sites de leurs clients.

## Fonctions du MVP

- **Comptes et espaces** : inscription, organisation (site industriel ou prestataire), rôles administrateur / technicien / lecture seule, invitations par e-mail, techniciens illimités.
- **Sites et inventaire** : sites regroupés par client pour les prestataires, fiches équipement, étiquette QR à coller (le scan ouvre la fiche sur le téléphone).
- **Import Excel / CSV** : reprise d'un inventaire existant, reconnaissance des libellés usuels (ASI, UPS, GE, armoire…), création automatique des contrôles par catégorie.
- **Plans de contrôle** : bibliothèque réglementaire (VPIE R4226-16, thermographie Q19, maintenance de tableaux, onduleurs, batteries, essais de groupe…), périodicités modifiables, échéancier « en retard / bientôt / à jour / à planifier ».
- **Alertes e-mail** : récapitulatif quotidien à J-60, J-30, J-7, puis relance le lendemain de l'échéance et chaque lundi tant que le contrôle n'est pas fait.
- **App terrain hors ligne** (PWA) : checklist OK / NOK / N/A, mesures, photos, signature du client. Les saisies sont stockées sur le téléphone et envoyées au retour du réseau. Chaque point NOK devient une observation à lever.
- **Rapports de contrôle et observations** : dépôt du PDF de l'organisme (Apave, Socotec…), saisie ou collage des observations, levée avec photo et commentaire, alerte si le rapport arrive après le délai de 5 semaines.
- **PDF** : dossier de conformité par site en un clic, rapport d'intervention signé.
- **Abonnement** : essai de 14 jours, offres Essentiel / Pro / Multi-sites / Prestataire via Stripe. À la fin de l'essai, les données restent consultables en lecture seule.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS · Supabase (PostgreSQL, Auth, Storage) avec cloisonnement par organisation (RLS) · @react-pdf/renderer · Brevo (e-mails) · Stripe · hébergement Vercel (cron quotidien des alertes).

## Démarrer en local

1. Créer un projet Supabase en région UE (Paris `eu-west-3` ou Francfort).
2. Appliquer la migration `supabase/migrations/20261026000000_init.sql` (SQL Editor, ou `npx supabase db push`).
3. Copier `.env.example` vers `.env.local` et renseigner les clés.
4. Dans Supabase › Authentication › URL Configuration, ajouter `http://localhost:3000/auth/callback` aux URL de redirection.
5. Lancer :

```bash
npm install
npm run dev
```

Tests et vérifications :

```bash
npm test          # logique métier, import, alertes, PDF
npm run typecheck
npm run build
```

## Mise en production

- **Vercel** : importer le dépôt, renseigner les variables de `.env.example`. Le cron défini dans `vercel.json` appelle `/api/cron/alertes` chaque matin à 6 h UTC avec `Authorization: Bearer $CRON_SECRET`.
- **Stripe** : créer un produit par offre (prix mensuels 49 €, 99 €, 199 €, 149 € + un prix « 5 € par site client »), reporter les identifiants de prix dans les variables `STRIPE_PRICE_*`, et déclarer le webhook `https://<domaine>/api/stripe/webhook` avec les événements `checkout.session.completed` et `customer.subscription.*`.
- **Brevo** : créer une clé API et valider le domaine de l'adresse d'expédition `ALERT_SENDER_EMAIL`.

## Organisation du code

```
src/lib/domain/      logique métier pure et testée (échéances, alertes, import, catégories, modèles de contrôle)
src/lib/pdf/         gabarits PDF
src/app/app/         application bureau (pages et actions serveur)
src/app/terrain/     application terrain hors ligne
src/app/api/         synchronisation terrain, PDF, QR, cron, webhook Stripe
supabase/migrations/ schéma, RLS, déclencheurs, stockage
```

## Limites connues du MVP

- Le portail client en lecture pour les prestataires, l'extraction automatique des observations d'un PDF et les applications natives sont prévus après le MVP.
- Les pages terrain consultées restent en cache sur le téléphone après déconnexion : à éviter sur un appareil partagé.
- VoltRegistre aide au suivi : il ne remplace pas les vérifications d'un organisme accrédité ou d'une personne qualifiée.
