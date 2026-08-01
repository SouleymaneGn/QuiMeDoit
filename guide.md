# Guide — Créer les tables Supabase pour iziCarnet

Je n'ai pas accès aux identifiants base de données / API de gestion de ton projet Supabase (seulement l'URL publique + la clé "publishable" dans `src/environment/environment.ts`, qui ne permettent que de lire/écrire des données dans des tables existantes, pas d'en créer). Tu dois donc exécuter ce script SQL toi-même, une seule fois.

## Étape 1 — Exécuter le script SQL

1. Va sur [supabase.com/dashboard](https://supabase.com/dashboard), ouvre ton projet iziCarnet.
2. Dans le menu de gauche, clique sur **SQL Editor**.
3. Clique **New query**, colle le script ci-dessous en entier, puis clique **Run**.

```sql
-- ============================================
-- iziCarnet — schéma initial
-- ============================================

-- Profil du commerçant (1 ligne par utilisateur connecté)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  owner_name text not null default '',
  business_name text not null default '',
  phone text not null default '',
  currency text not null default 'GNF',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Un utilisateur voit son propre profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Un utilisateur modifie son propre profil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Un utilisateur crée son propre profil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Clients
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "Un utilisateur gère ses propres clients"
  on public.customers for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index customers_owner_id_idx on public.customers(owner_id);

-- Transactions (dettes / paiements)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('DEBT', 'PAYMENT')),
  label text not null,
  amount integer not null check (amount > 0),
  payment_method text not null check (payment_method in ('CASH', 'ORANGE_MONEY', 'MOBILE_MONEY')),
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Un utilisateur gère ses propres transactions"
  on public.transactions for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index transactions_owner_id_idx on public.transactions(owner_id);
create index transactions_customer_id_idx on public.transactions(customer_id);

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, owner_name, business_name, phone, currency)
  values (new.id, coalesce(new.raw_user_meta_data->>'displayName', ''), '', '', 'GNF');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## Pourquoi ce schéma

- **Isolation par utilisateur (multi-tenant)** : chaque commerçant ne voit et ne modifie que ses propres clients/transactions/profil, grâce à Row Level Security (`auth.uid() = owner_id`). Sans ça, n'importe quel compte connecté verrait les données de tous les autres commerçants — indispensable pour un vrai SaaS.
- **`profiles.id` = l'id Supabase Auth de l'utilisateur** (pas un id généré séparément) : garantit une relation 1-pour-1 propre entre un compte et son profil marchand.
- **Le trigger `on_auth_user_created`** crée automatiquement la ligne `profiles` dès qu'un compte est créé via `/signup`, avec le nom saisi à l'inscription — pas besoin de gérer un état "profil manquant" côté app.
- **`amount` en `integer`** : le GNF n'a pas de sous-unité, les montants sont toujours des nombres entiers (cohérent avec le reste de l'app).
- Les noms de colonnes sont en `snake_case` (convention Postgres) ; la conversion vers les `camelCase` utilisés côté Angular (`ownerName`, `businessName`, `customerId`...) est gérée dans le code, pas dans la base.

## Étape 2 — Vérifier que ça a marché

Dans le dashboard Supabase, onglet **Table Editor** : tu dois voir 3 tables — `profiles`, `customers`, `transactions`.

Optionnel : crée un nouveau compte via `/signup` dans l'app, puis regarde la table `profiles` — une ligne doit être apparue automatiquement avec ton nom.

## Étape 3 — Basculer l'app sur les vraies données

Une fois le script exécuté, préviens-moi. Je basculerai `app.config.ts` pour utiliser les repositories Supabase (déjà codés) à la place des repositories JSON mock — un changement d'une poignée de lignes, sans toucher aux pages ni aux services, grâce à l'architecture en place depuis le début.

⚠️ Une fois basculé, les données mock (`assets/mock/*.json`) ne seront plus utilisées ; les vraies données viendront de Supabase, séparées par compte utilisateur.
