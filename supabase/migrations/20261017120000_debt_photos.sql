-- Photo justificative d'une dette (carnet, reçu, facture).
-- La table ne garde que le chemin ; l'image est dans le bucket privé « debt-photos »,
-- rangée par commerçant : {owner_id}/{uuid}.jpg. Le relevé partagé ne l'expose pas.
alter table public.transactions
  add column if not exists photo_path text
  check (photo_path is null or length(photo_path) <= 300);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('debt-photos', 'debt-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Chaque commerçant ne lit, n'ajoute et ne supprime que les fichiers de son dossier.
drop policy if exists "debt_photos_select_own" on storage.objects;
create policy "debt_photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'debt-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "debt_photos_insert_own" on storage.objects;
create policy "debt_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'debt-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "debt_photos_delete_own" on storage.objects;
create policy "debt_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'debt-photos' and (storage.foldername(name))[1] = auth.uid()::text);
