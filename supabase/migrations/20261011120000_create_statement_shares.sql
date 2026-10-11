-- Relevé client partageable par lien.
--
-- Un partage = un jeton aléatoire (uuid v4, non devinable) qui donne accès en
-- lecture seule au relevé d'UN client, sans compte. Le lien est « vivant » :
-- il affiche toujours le solde à jour (calculé à partir des transactions, jamais
-- stocké), tant qu'il n'est ni expiré ni désactivé.
--
-- Les anonymes n'ont AUCUN accès direct aux tables : ils passent uniquement par
-- la fonction get_shared_statement(), qui ne renvoie que le strict nécessaire.

create table if not exists public.statement_shares (
  token uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

create index if not exists statement_shares_customer_id_idx on public.statement_shares (customer_id);
create index if not exists statement_shares_owner_id_idx on public.statement_shares (owner_id);

alter table public.statement_shares enable row level security;

create policy "Les commerçants lisent leurs propres partages"
  on public.statement_shares
  for select
  using (auth.uid() = owner_id);

-- Un commerçant ne peut partager que le relevé d'un de SES clients.
create policy "Les commerçants partagent le relevé de leurs clients"
  on public.statement_shares
  for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.owner_id = auth.uid()
    )
  );

-- Utilisé pour la désactivation (revoked_at).
create policy "Les commerçants désactivent leurs propres partages"
  on public.statement_shares
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Lecture publique d'un relevé via son jeton. Renvoie null si le jeton est
-- inconnu, expiré ou désactivé.
create or replace function public.get_shared_statement(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'businessName', coalesce(p.business_name, ''),
    'currency', coalesce(nullif(p.currency, ''), 'GNF'),
    'customerName', c.name,
    'customerPhone', c.phone,
    'expiresAt', s.expires_at,
    'transactions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'type', t.type,
          'label', t.label,
          'amount', t.amount,
          'createdAt', t.created_at
        )
        order by t.created_at desc
      )
      from public.transactions t
      where t.customer_id = c.id and t.owner_id = s.owner_id
    ), '[]'::jsonb)
  )
  from public.statement_shares s
  join public.customers c on c.id = s.customer_id and c.owner_id = s.owner_id
  left join public.profiles p on p.id = s.owner_id
  where s.token = p_token
    and s.revoked_at is null
    and s.expires_at > now();
$$;

revoke all on function public.get_shared_statement(uuid) from public;
grant execute on function public.get_shared_statement(uuid) to anon, authenticated;
