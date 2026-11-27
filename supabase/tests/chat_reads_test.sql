-- Tandem · тесты chat_reads: таблица в Realtime, и каждый видит только свои строки
-- (Realtime проверяет ту же политику RLS). Всё в транзакции, в конце откат.
begin;

create function pg_temp.login(p uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok  - %', msg;
end $$;

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000c9');
insert into public.platform_admins values ('00000000-0000-0000-0000-0000000000c9');

select pg_temp.ok(exists (
  select 1 from pg_publication_tables
  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_reads'
), 'chat_reads входит в публикацию Realtime');

select pg_temp.login('00000000-0000-0000-0000-0000000000c9');
select public.admin_activate_subscription('00000000-0000-0000-0000-0000000000c1', now() + interval '30 days');

-- Владелец создаёт компанию и чат на всю компанию, второй пользователь вступает по ссылке.
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
insert into ids values ('org', public.create_organization('Прочтения', 'reads-co'));
insert into ids values ('chat', public.create_page((select v from ids where k='org'), 'chat', 'Чат', '[{"kind":"organization"}]'));
create temp table tok (v text);
grant all on tok to authenticated;
insert into tok select public.create_invite((select v from ids where k='org'));

select pg_temp.login('00000000-0000-0000-0000-0000000000c2');
select public.accept_invite((select v from tok));
select public.mark_chat_read((select v from ids where k='chat'));

select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
select public.mark_chat_read((select v from ids where k='chat'));

select pg_temp.ok((select count(*) from public.chat_reads) = 1, 'владелец видит только свою строку chat_reads');
select pg_temp.ok((select user_id from public.chat_reads) = '00000000-0000-0000-0000-0000000000c1',
  'видимая строка — своя');

select pg_temp.login('00000000-0000-0000-0000-0000000000c2');
select pg_temp.ok((select count(*) from public.chat_reads) = 1, 'сотрудник видит только свою строку chat_reads');
select pg_temp.ok(not exists (
  select 1 from public.chat_reads where user_id = '00000000-0000-0000-0000-0000000000c1'
), 'чужое прочтение не видно');

rollback;
