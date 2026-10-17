-- Photo justificative d'un achat à crédit fournisseur (facture, bon de livraison).
-- Même bucket privé que les dettes clients (« debt-photos », dossier {owner_id}/),
-- la table ne garde que le chemin.
alter table public.supplier_transactions
  add column if not exists photo_path text
  check (photo_path is null or length(photo_path) <= 300);
