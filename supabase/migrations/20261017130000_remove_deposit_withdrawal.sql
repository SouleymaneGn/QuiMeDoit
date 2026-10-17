-- Suppression des dépôts / retraits clients : une opération client n'est plus
-- qu'une DETTE ou un PAIEMENT (solde = DETTES − PAIEMENTS).
--
-- Les éventuelles anciennes opérations sont converties sans changer aucun solde :
--   DEPOSIT    → PAYMENT (l'argent confié diminuait déjà ce que le client doit)
--   WITHDRAWAL → DEBT    (l'argent repris l'augmentait)
-- Les opérations annulées restent annulées (motif conservé).

-- Le trigger « opération annulée figée » bloquerait la conversion des opérations
-- annulées : il est suspendu le temps de la mise à jour, dans la même transaction.
alter table public.transactions disable trigger transactions_prevent_cancelled_update;

update public.transactions set type = 'PAYMENT' where type = 'DEPOSIT';
update public.transactions set type = 'DEBT' where type = 'WITHDRAWAL';

alter table public.transactions enable trigger transactions_prevent_cancelled_update;

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions
  add constraint transactions_type_check
  check (type in ('DEBT', 'PAYMENT'));

comment on column public.transactions.paid_by is
  'Personne qui a apporté l''argent quand ce n''est pas le client lui-même (paiements uniquement).';
