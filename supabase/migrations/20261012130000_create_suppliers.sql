-- Dettes fournisseurs — cf. plan « Dettes fournisseurs », Phase 0.
--
-- Miroir de customers / transactions, dans l'autre sens : ici c'est le
-- commerçant qui doit de l'argent. Tables séparées à dessein, pour que rien ne
-- change côté clients (totaux, relevé, quota gratuit de 10 clients).
--
-- Reste à payer d'un fournisseur = somme des PURCHASE − somme des PAYMENT,
-- calculé côté app, jamais stocké (même règle que le solde client).
--
-- Fonctionnalité réservée aux abonnés, appliquée ici et pas seulement dans
-- l'interface : lecture toujours permise au propriétaire (il ne perd jamais
-- l'accès à ce qu'il doit si son abonnement expire), écriture seulement si
-- has_paid_access().

-- Même règle que hasAppAccess() côté app (src/app/core/utils/subscription.util.ts),
-- sans le quota gratuit : ADMIN/EMPLOYEE, ou abonnement actif non expiré.
-- security definer : lit profiles et subscriptions sans dépendre de leurs policies.
create or replace function public.has_paid_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('ADMIN', 'EMPLOYEE')
  )
  or exists (
    select 1 from public.subscriptions s
    where s.id = auth.uid()
      and s.status = 'active'
      and s.current_period_ends_at > now()
  );
$$;

revoke all on function public.has_paid_access() from public;
grant execute on function public.has_paid_access() to authenticated;

-- Fournisseurs
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists suppliers_owner_id_idx on public.suppliers (owner_id);

alter table public.suppliers enable row level security;

create policy "Les commerçants lisent leurs fournisseurs"
  on public.suppliers
  for select
  using (auth.uid() = owner_id);

create policy "Les abonnés créent leurs fournisseurs"
  on public.suppliers
  for insert
  with check (auth.uid() = owner_id and public.has_paid_access());

create policy "Les abonnés modifient leurs fournisseurs"
  on public.suppliers
  for update
  using (auth.uid() = owner_id and public.has_paid_access())
  with check (auth.uid() = owner_id and public.has_paid_access());

create policy "Les abonnés suppriment leurs fournisseurs"
  on public.suppliers
  for delete
  using (auth.uid() = owner_id and public.has_paid_access());

-- Achats à crédit (PURCHASE) et règlements (PAYMENT) auprès d'un fournisseur
create table if not exists public.supplier_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  type text not null check (type in ('PURCHASE', 'PAYMENT')),
  label text not null,
  amount integer not null check (amount > 0),
  payment_method text not null check (payment_method in ('CASH', 'ORANGE_MONEY', 'MOBILE_MONEY')),
  created_at timestamptz not null default now()
);

create index if not exists supplier_transactions_owner_id_idx on public.supplier_transactions (owner_id);
create index if not exists supplier_transactions_supplier_id_idx on public.supplier_transactions (supplier_id);

alter table public.supplier_transactions enable row level security;

create policy "Les commerçants lisent leurs opérations fournisseurs"
  on public.supplier_transactions
  for select
  using (auth.uid() = owner_id);

-- Une opération ne peut viser qu'un de SES fournisseurs.
create policy "Les abonnés enregistrent leurs opérations fournisseurs"
  on public.supplier_transactions
  for insert
  with check (
    auth.uid() = owner_id
    and public.has_paid_access()
    and exists (
      select 1 from public.suppliers s
      where s.id = supplier_id and s.owner_id = auth.uid()
    )
  );

create policy "Les abonnés modifient leurs opérations fournisseurs"
  on public.supplier_transactions
  for update
  using (auth.uid() = owner_id and public.has_paid_access())
  with check (
    auth.uid() = owner_id
    and public.has_paid_access()
    and exists (
      select 1 from public.suppliers s
      where s.id = supplier_id and s.owner_id = auth.uid()
    )
  );

create policy "Les abonnés suppriment leurs opérations fournisseurs"
  on public.supplier_transactions
  for delete
  using (auth.uid() = owner_id and public.has_paid_access());
