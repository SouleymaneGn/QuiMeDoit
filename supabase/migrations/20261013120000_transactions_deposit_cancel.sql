-- Dépôts / retraits clients et annulation des opérations (plus de suppression).
--
-- Solde client = DEBT + WITHDRAWAL − PAYMENT − DEPOSIT, opérations annulées exclues.
--   DEPOSIT    : le client confie de l'argent au commerçant (avance, épargne).
--   WITHDRAWAL : le client reprend de l'argent déposé.
--
-- Une opération n'est plus jamais supprimée : elle est annulée (cancelled_at +
-- motif obligatoire), reste visible dans l'historique et ne compte plus dans les
-- soldes. Une opération annulée ne peut plus être modifiée.
--
-- La table transactions a été créée hors migrations : les noms de la contrainte
-- sur `type` et de la politique de suppression sont retrouvés dynamiquement.

-- 1. Nouveaux types ---------------------------------------------------------

do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.transactions'::regclass
      and con.contype = 'c'
      and att.attname = 'type'
  loop
    execute format('alter table public.transactions drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('DEBT', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL'));

-- 2. Annulation -------------------------------------------------------------

alter table public.transactions
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text;

alter table public.transactions
  add constraint transactions_cancel_reason_check
  check (cancelled_at is null or length(trim(coalesce(cancel_reason, ''))) > 0);

alter table public.supplier_transactions
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text;

alter table public.supplier_transactions
  add constraint supplier_transactions_cancel_reason_check
  check (cancelled_at is null or length(trim(coalesce(cancel_reason, ''))) > 0);

-- Une opération annulée est figée (trace conservée, pas de « désannulation »).
create or replace function public.prevent_cancelled_operation_update()
returns trigger
language plpgsql
as $$
begin
  if old.cancelled_at is not null then
    raise exception 'Opération annulée : elle ne peut plus être modifiée.';
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_prevent_cancelled_update on public.transactions;
create trigger transactions_prevent_cancelled_update
  before update on public.transactions
  for each row execute function public.prevent_cancelled_operation_update();

drop trigger if exists supplier_transactions_prevent_cancelled_update on public.supplier_transactions;
create trigger supplier_transactions_prevent_cancelled_update
  before update on public.supplier_transactions
  for each row execute function public.prevent_cancelled_operation_update();

-- 3. Plus de suppression ----------------------------------------------------

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'transactions' and cmd = 'DELETE'
  loop
    execute format('drop policy %I on public.transactions', p.policyname);
  end loop;
end $$;

drop policy if exists "Les abonnés suppriment leurs opérations fournisseurs" on public.supplier_transactions;

-- 4. Relevé partagé : les opérations annulées n'y figurent pas --------------

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
      where t.customer_id = c.id
        and t.owner_id = s.owner_id
        and t.cancelled_at is null
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
