-- =====================================================================
-- Tandem · миграция 9 · хранилище картинок и Realtime
-- avatars/<user_id>/...  — загружает только владелец профиля
-- logos/<organization_id>/... — загружают Owner и Admin компании
-- Оба бакета публичные на чтение: картинки показываются в каталоге.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('logos',   'logos',   true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy logos_insert_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] in (
    select m.organization_id::text from public.memberships m
    where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')));
create policy logos_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in (
    select m.organization_id::text from public.memberships m
    where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')))
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] in (
    select m.organization_id::text from public.memberships m
    where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')));
create policy logos_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in (
    select m.organization_id::text from public.memberships m
    where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')));

-- Realtime: изменения приходят подписчикам только если RLS разрешает им эту строку.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_comments;
