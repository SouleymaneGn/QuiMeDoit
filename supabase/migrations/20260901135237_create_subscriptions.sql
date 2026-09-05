-- Abonnement SaaSPay — cf. abonement.md, Phase 0.
--
-- Table de suivi de l'abonnement, 1:1 avec un utilisateur. Séparée de
-- `profiles` à dessein : elle n'est jamais modifiable par le client (RLS en
-- lecture seule), seuls le trigger d'auto-provisioning ci-dessous et les
-- futures Edge Functions (create-checkout / saaspay-webhook, via la clé
-- service role qui contourne RLS) peuvent y écrire.
--
-- Le quota gratuit de 10 clients (FREE_CUSTOMER_LIMIT dans
-- src/app/core/utils/subscription.util.ts) n'est PAS stocké ici : il se
-- calcule côté app à partir du nombre de clients réels
-- (CustomerService.customers().length), comme le solde d'un client se
-- calcule à partir de ses transactions plutôt que d'être stocké.

create table if not exists public.subscriptions (
  id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'free'
    check (status in ('free', 'active', 'past_due', 'canceled')),
  current_period_ends_at timestamptz,
  saaspay_customer_id text,
  saaspay_subscription_id text,
  last_payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Lecture seule pour le propriétaire : le statut ne doit jamais pouvoir être
-- modifié depuis le client, uniquement lu (par le guard et par la page
-- Abonnement/Paramètres).
create policy "Les utilisateurs lisent leur propre abonnement"
  on public.subscriptions
  for select
  using (auth.uid() = id);

-- Maintient updated_at à jour à chaque écriture serveur (trigger / Edge Functions).
create or replace function public.set_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_subscriptions_updated_at();

-- Auto-provisioning : dès qu'une ligne `profiles` est créée (via le trigger
-- existant sur auth.users, non versionné dans ce repo et donc volontairement
-- non modifié ici, OU via le repli côté client de
-- SupabaseProfileRepository.get() pour les comptes créés avant ce trigger),
-- on crée automatiquement la ligne `subscriptions` correspondante avec le
-- statut gratuit. Brancher ici plutôt que sur auth.users évite de réécrire à
-- l'aveugle un trigger dont on ne connaît pas la définition exacte.
create or replace function public.create_subscription_for_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (id, status)
  values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_subscription on public.profiles;
create trigger profiles_create_subscription
  after insert on public.profiles
  for each row
  execute function public.create_subscription_for_new_profile();

-- Filet de rattrapage pour les comptes déjà existants au moment où cette
-- migration s'applique (sinon ils n'auraient de ligne `subscriptions` qu'au
-- prochain repli côté client) : on provisionne tout de suite une ligne
-- 'free' pour chaque profil déjà présent qui n'en a pas encore.
insert into public.subscriptions (id, status)
select p.id, 'free'
from public.profiles p
left join public.subscriptions s on s.id = p.id
where s.id is null;
