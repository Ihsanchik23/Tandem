-- Tandem · тесты прав на столбцы (миграция column_update_grants). Всё в транзакции, в конце откат.
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
create function pg_temp.fails(p_sql text, p_expect text, msg text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_expect || '%' or sqlstate = p_expect then raise notice 'ok  - %', msg; return; end if;
    raise exception 'FAIL: % (%)', msg, sqlerrm;
  end;
  raise exception 'FAIL: % (ошибки не было)', msg;
end $$;

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated, anon;

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000cc01');
insert into public.subscriptions (owner_user_id, paid_until, seats)
values ('00000000-0000-0000-0000-00000000cc01', now() + interval '30 days', 15);

select pg_temp.login('00000000-0000-0000-0000-00000000cc01');
insert into ids values ('org', public.create_organization('Гранты', 'grants-co'));
select pg_temp.ok((select count(*) = 1 from public.organizations where slug = 'grants-co'), 'create_organization (security definer) работает');

-- Компания: разрешённые столбцы меняются, остальные — отказ 42501.
with u as (update public.organizations set name = 'Гранты 2', city = 'Астана', description = 'x', logo_url = null
           where id = (select v from ids where k = 'org') returning 1)
select pg_temp.ok((select count(*) = 1 from u), 'Owner меняет name, city, description, logo_url (триггер updated_at не мешает)');
select pg_temp.fails(format('update public.organizations set slug = %L where id = %L', 'other-co', (select v from ids where k = 'org')),
  '42501', 'Owner не может поменять slug');
select pg_temp.fails(format('update public.organizations set created_by = null where id = %L', (select v from ids where k = 'org')),
  '42501', 'Owner не может поменять created_by');
select pg_temp.fails(format('update public.organizations set id = gen_random_uuid() where id = %L', (select v from ids where k = 'org')),
  '42501', 'Owner не может поменять id');

-- Профиль: разрешённые столбцы меняются, остальные — отказ 42501.
with u as (update public.profiles set bio = 'привет', city = 'Алматы', first_name = 'Тест'
           where id = '00000000-0000-0000-0000-00000000cc01' returning 1)
select pg_temp.ok((select count(*) = 1 from u), 'Пользователь меняет bio, city, first_name своего профиля');
select pg_temp.fails('update public.profiles set id = gen_random_uuid() where id = ''00000000-0000-0000-0000-00000000cc01''',
  '42501', 'Пользователь не может поменять id профиля');
select pg_temp.fails('update public.profiles set created_at = now() where id = ''00000000-0000-0000-0000-00000000cc01''',
  '42501', 'Пользователь не может поменять created_at профиля');

-- Без входа (anon) менять нельзя ничего.
reset role;
set local role anon;
select pg_temp.fails('update public.profiles set bio = ''x''', '42501', 'anon не может менять profiles');
select pg_temp.fails('update public.organizations set name = ''x''', '42501', 'anon не может менять organizations');

reset role;
rollback;
