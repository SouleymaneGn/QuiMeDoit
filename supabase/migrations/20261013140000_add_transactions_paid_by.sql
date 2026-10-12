-- « Payé par » : personne qui a apporté l'argent quand ce n'est pas le client
-- lui-même (ex. « Dépôt par Alpha Yagouba »). Facultatif, paiements et dépôts.
alter table public.transactions
  add column if not exists paid_by text
  check (paid_by is null or length(paid_by) <= 120);
