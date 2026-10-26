-- VoltRegistre : schéma initial (multi-organisations, cloisonné par RLS)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Organisations et membres
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  kind text not null default 'industriel' check (kind in ('industriel', 'prestataire')),
  plan text not null default 'essai' check (plan in ('essai', 'essentiel', 'pro', 'multisites', 'prestataire')),
  trial_ends_at timestamptz not null default now() + interval '14 days',
  subscription_status text,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  email text not null,
  role text not null default 'technicien' check (role in ('admin', 'technicien', 'lecteur')),
  receives_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index on public.memberships (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  email text not null,
  role text not null default 'technicien' check (role in ('admin', 'technicien', 'lecteur')),
  invited_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create or replace function public.is_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m where m.org_id = org and m.user_id = auth.uid());
$$;

create or replace function public.has_role(org uuid, roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.org_id = org and m.user_id = auth.uid() and m.role = any (roles)
  );
$$;

-- Création d'une organisation par un utilisateur connecté, qui en devient admin.
create or replace function public.create_organization(org_name text, org_kind text default 'industriel')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  select email into user_email from auth.users where id = auth.uid();
  insert into organizations (name, kind) values (org_name, org_kind) returning id into new_id;
  insert into memberships (org_id, user_id, email, role) values (new_id, auth.uid(), user_email, 'admin');
  return new_id;
end;
$$;

-- Les invitations en attente sont acceptées à la création du compte.
create or replace function public.accept_invitations()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into memberships (org_id, user_id, email, role)
  select i.org_id, new.id, new.email, i.role
  from invitations i where lower(i.email) = lower(new.email)
  on conflict do nothing;
  delete from invitations where lower(email) = lower(new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.accept_invitations();

-- Accepte aussi les invitations envoyées à un utilisateur qui a déjà un compte.
create or replace function public.accept_pending_invitations()
returns integer language plpgsql security definer set search_path = public as $$
declare
  user_email text;
  n integer;
begin
  select email into user_email from auth.users where id = auth.uid();
  insert into memberships (org_id, user_id, email, role)
  select i.org_id, auth.uid(), user_email, i.role
  from invitations i where lower(i.email) = lower(user_email)
  on conflict do nothing;
  get diagnostics n = row_count;
  delete from invitations where lower(email) = lower(user_email);
  return n;
end;
$$;

-- Chaque membre peut activer ou couper ses propres alertes, sans pouvoir changer son rôle.
create or replace function public.set_my_alerts(org uuid, enabled boolean)
returns void language sql security definer set search_path = public as $$
  update memberships set receives_alerts = enabled where org_id = org and user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Sites et équipements
-- ---------------------------------------------------------------------------
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  name text not null check (length(trim(name)) > 0),
  client_name text,
  address text,
  created_at timestamptz not null default now(),
  unique (id, org_id)
);
create index on public.sites (org_id);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  site_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  category text not null,
  location text,
  manufacturer text,
  model text,
  serial_number text,
  commissioned_on date,
  rated_power text,
  notes text,
  qr_token uuid not null default gen_random_uuid() unique,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, org_id),
  foreign key (site_id, org_id) references public.sites (id, org_id) on delete cascade
);
create index on public.equipment (org_id);
create index on public.equipment (site_id);

-- Les clés étrangères composites (id, org_id) empêchent de rattacher une ligne
-- à un site ou un équipement d'une autre organisation.

-- ---------------------------------------------------------------------------
-- Plans de contrôle et interventions
-- ---------------------------------------------------------------------------
create table public.control_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  site_id uuid not null,
  equipment_id uuid,
  template_code text,
  label text not null,
  reference text,
  periodicity_months integer not null check (periodicity_months between 1 and 120),
  checklist jsonb not null default '[]'::jsonb,
  first_due_on date,
  last_done_on date,
  next_due_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, org_id),
  foreign key (site_id, org_id) references public.sites (id, org_id) on delete cascade,
  foreign key (equipment_id, org_id) references public.equipment (id, org_id) on delete cascade
);
create index on public.control_plans (org_id, next_due_on);
create index on public.control_plans (equipment_id);

create or replace function public.compute_next_due()
returns trigger language plpgsql as $$
begin
  if new.last_done_on is not null then
    new.next_due_on := (new.last_done_on + make_interval(months => new.periodicity_months))::date;
  else
    new.next_due_on := new.first_due_on;
  end if;
  return new;
end;
$$;

create trigger control_plans_next_due
  before insert or update of last_done_on, first_due_on, periodicity_months on public.control_plans
  for each row execute function public.compute_next_due();

create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  site_id uuid not null,
  control_plan_id uuid,
  equipment_id uuid,
  -- Identifiant généré sur le téléphone : évite les doublons lors des synchronisations hors ligne.
  client_ref uuid unique,
  performed_on date not null,
  technician_id uuid references auth.users on delete set null,
  technician_name text,
  result text not null check (result in ('conforme', 'reserves', 'non_conforme')),
  checklist jsonb not null default '[]'::jsonb,
  measures text,
  comments text,
  signed_by text,
  signature_path text,
  created_at timestamptz not null default now(),
  unique (id, org_id),
  foreign key (site_id, org_id) references public.sites (id, org_id) on delete cascade,
  foreign key (control_plan_id, org_id) references public.control_plans (id, org_id) on delete set null (control_plan_id),
  foreign key (equipment_id, org_id) references public.equipment (id, org_id) on delete set null (equipment_id)
);
create index on public.interventions (org_id, performed_on desc);
create index on public.interventions (equipment_id);

create table public.intervention_photos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  intervention_id uuid not null,
  path text not null,
  created_at timestamptz not null default now(),
  foreign key (intervention_id, org_id) references public.interventions (id, org_id) on delete cascade
);

-- Une intervention réalisée met à jour la date de dernière réalisation du plan.
create or replace function public.intervention_done()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.control_plan_id is not null then
    update control_plans
      set last_done_on = greatest(coalesce(last_done_on, new.performed_on), new.performed_on)
      where id = new.control_plan_id and org_id = new.org_id;
  end if;
  return new;
end;
$$;

create trigger interventions_done
  after insert on public.interventions
  for each row execute function public.intervention_done();

-- ---------------------------------------------------------------------------
-- Rapports des organismes de contrôle et observations
-- ---------------------------------------------------------------------------
create table public.inspection_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  site_id uuid not null,
  control_plan_id uuid,
  organism text not null,
  inspected_on date not null,
  received_on date,
  file_path text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, org_id),
  foreign key (site_id, org_id) references public.sites (id, org_id) on delete cascade,
  foreign key (control_plan_id, org_id) references public.control_plans (id, org_id) on delete set null (control_plan_id)
);
create index on public.inspection_reports (site_id, inspected_on desc);

create or replace function public.report_done()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.control_plan_id is not null then
    update control_plans
      set last_done_on = greatest(coalesce(last_done_on, new.inspected_on), new.inspected_on)
      where id = new.control_plan_id and org_id = new.org_id;
  end if;
  return new;
end;
$$;

create trigger inspection_reports_done
  after insert on public.inspection_reports
  for each row execute function public.report_done();

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  site_id uuid not null,
  report_id uuid,
  intervention_id uuid,
  equipment_id uuid,
  reference text,
  description text not null check (length(trim(description)) > 0),
  severity text not null default 'majeure' check (severity in ('mineure', 'majeure', 'critique')),
  status text not null default 'ouverte' check (status in ('ouverte', 'levee')),
  due_on date,
  photo_before_path text,
  lifted_on date,
  lifted_by text,
  lift_comment text,
  photo_after_path text,
  created_at timestamptz not null default now(),
  foreign key (site_id, org_id) references public.sites (id, org_id) on delete cascade,
  foreign key (report_id, org_id) references public.inspection_reports (id, org_id) on delete cascade,
  foreign key (intervention_id, org_id) references public.interventions (id, org_id) on delete cascade,
  foreign key (equipment_id, org_id) references public.equipment (id, org_id) on delete set null (equipment_id)
);
create index on public.observations (org_id, status);
create index on public.observations (site_id);

-- Journal des alertes envoyées : une seule alerte par plan, seuil et échéance.
create table public.alert_log (
  control_plan_id uuid not null references public.control_plans on delete cascade,
  due_on date not null,
  threshold text not null,
  sent_on date not null default current_date,
  primary key (control_plan_id, due_on, threshold, sent_on)
);

-- ---------------------------------------------------------------------------
-- Sécurité par ligne
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.sites enable row level security;
alter table public.equipment enable row level security;
alter table public.control_plans enable row level security;
alter table public.interventions enable row level security;
alter table public.intervention_photos enable row level security;
alter table public.inspection_reports enable row level security;
alter table public.observations enable row level security;
alter table public.alert_log enable row level security;

create policy "membres lisent leur organisation" on public.organizations
  for select using (public.is_member(id));
create policy "admins modifient leur organisation" on public.organizations
  for update using (public.has_role(id, array['admin']))
  with check (public.has_role(id, array['admin']));

create policy "membres voient l'équipe" on public.memberships
  for select using (public.is_member(org_id));
create policy "admins gèrent l'équipe" on public.memberships
  for update using (public.has_role(org_id, array['admin']));

create policy "admins retirent un membre" on public.memberships
  for delete using (public.has_role(org_id, array['admin']) and user_id <> auth.uid());

create policy "admins gèrent les invitations" on public.invitations
  for all using (public.has_role(org_id, array['admin']))
  with check (public.has_role(org_id, array['admin']));

-- Tables métier : lecture pour tous les membres, écriture pour admin et technicien,
-- suppression réservée aux admins.
do $$
declare t text;
begin
  foreach t in array array['sites', 'equipment', 'control_plans', 'interventions',
                           'intervention_photos', 'inspection_reports', 'observations']
  loop
    execute format('create policy "lecture membres" on public.%I for select using (public.is_member(org_id))', t);
    execute format('create policy "ajout équipe" on public.%I for insert with check (public.has_role(org_id, array[''admin'',''technicien'']))', t);
    execute format('create policy "modification équipe" on public.%I for update using (public.has_role(org_id, array[''admin'',''technicien''])) with check (public.has_role(org_id, array[''admin'',''technicien'']))', t);
    execute format('create policy "suppression admin" on public.%I for delete using (public.has_role(org_id, array[''admin'']))', t);
  end loop;
end;
$$;

-- alert_log n'est accessible qu'avec la clé service (cron) : aucune policy.

-- ---------------------------------------------------------------------------
-- Stockage des fichiers (photos, signatures, rapports PDF)
-- Chemin : <org_id>/<dossier>/<fichier>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fichiers', 'fichiers', false)
on conflict (id) do nothing;

create policy "membres lisent les fichiers" on storage.objects
  for select using (
    bucket_id = 'fichiers' and public.is_member(((storage.foldername(name))[1])::uuid)
  );
create policy "équipe dépose des fichiers" on storage.objects
  for insert with check (
    bucket_id = 'fichiers'
    and public.has_role(((storage.foldername(name))[1])::uuid, array['admin', 'technicien'])
  );
create policy "admins suppriment des fichiers" on storage.objects
  for delete using (
    bucket_id = 'fichiers' and public.has_role(((storage.foldername(name))[1])::uuid, array['admin'])
  );

-- Les admins ne peuvent modifier que le nom de l'organisation : l'offre et l'état
-- de l'abonnement ne sont écrits que par le serveur (webhook Stripe, clé service).
revoke update on public.organizations from authenticated, anon;
grant update (name) on public.organizations to authenticated;
-- De même, un admin ne peut changer que le rôle et les alertes d'un membre.
revoke update on public.memberships from authenticated, anon;
grant update (role, receives_alerts) on public.memberships to authenticated;
