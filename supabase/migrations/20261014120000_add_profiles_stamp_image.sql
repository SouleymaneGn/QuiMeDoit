-- Cachet du commerce : image PNG (data URL, ~400 px, fond transparent)
-- importée dans Paramètres et apposée sur les relevés (écran et PDF).
-- Stockée dans profiles pour que le relevé public (lien WhatsApp) puisse
-- l'afficher sans accès au stockage de fichiers.
alter table public.profiles
  add column if not exists stamp_image text
  check (
    stamp_image is null
    or (stamp_image like 'data:image/%' and length(stamp_image) <= 600000)
  );

-- Relevé partagé : ajoute le cachet (opérations annulées toujours exclues).
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
    'stampImage', p.stamp_image,
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
