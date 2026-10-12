-- Plafond de crédit par client.
--
-- Montant maximal de dette que le commerçant accepte d'accorder à un client.
-- null = pas de plafond. Le dépassement n'est PAS bloqué en base : l'app
-- avertit le commerçant, qui reste libre d'enregistrer la dette. Le solde
-- n'est toujours pas stocké, il se compare au plafond côté app.
--
-- Pas de nouvelle policy : la policy "Un utilisateur gère ses propres clients"
-- (for all, auth.uid() = owner_id) couvre déjà cette colonne.

alter table public.customers
  add column if not exists credit_limit integer
    check (credit_limit is null or credit_limit > 0);
