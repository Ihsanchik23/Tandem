-- Tandem · тесты get_page_people (люди с доступом к странице). Всё в транзакции, в конце откат.
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
    if sqlerrm like '%' || p_expect || '%' then raise notice 'ok  - %', msg; return; end if;
    raise exception 'FAIL: % (%)', msg, sqlerrm;
  end;
  raise exception 'FAIL: % (ошибки не было)', msg;
end $$;

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated, anon;

-- Люди: владелец A (cc001), сотрудник A в Филиале (cc002), сотрудник A на Складе (cc003), владелец B (cc009).
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000cc001'), ('00000000-0000-0000-0000-0000000cc002'),
  ('00000000-0000-0000-0000-0000000cc003'), ('00000000-0000-0000-0000-0000000cc009');
update public.profiles set last_name = 'Яковлев', first_name = 'Олег' where id = '00000000-0000-0000-0000-0000000cc001';
update public.profiles set last_name = 'Абаев',   first_name = 'Ерлан' where id = '00000000-0000-0000-0000-0000000cc002';
insert into public.subscriptions (owner_user_id, paid_until, seats) values
  ('00000000-0000-0000-0000-0000000cc001', now() + interval '30 days', 15),
  ('00000000-0000-0000-0000-0000000cc009', now() + interval '30 days', 15);

select pg_temp.login('00000000-0000-0000-0000-0000000cc001');
insert into ids values ('A', public.create_organization('Люди А', 'people-a'));
select pg_temp.login('00000000-0000-0000-0000-0000000cc009');
insert into ids values ('B', public.create_organization('Люди Б', 'people-b'));

reset role;
insert into public.memberships (organization_id, user_id, role, position) values
  ((select v from ids where k='A'), '00000000-0000-0000-0000-0000000cc002', 'employee', 'Кассир'),
  ((select v from ids where k='A'), '00000000-0000-0000-0000-0000000cc003', 'employee', null);
insert into ids values ('f', gen_random_uuid()), ('s', gen_random_uuid());
insert into public.units (id, organization_id, parent_id, name) values
  ((select v from ids where k='f'), (select v from ids where k='A'), null, 'Филиал'),
  ((select v from ids where k='s'), (select v from ids where k='A'), null, 'Склад');
insert into public.unit_members (organization_id, unit_id, user_id) values
  ((select v from ids where k='A'), (select v from ids where k='f'), '00000000-0000-0000-0000-0000000cc002'),
  ((select v from ids where k='A'), (select v from ids where k='s'), '00000000-0000-0000-0000-0000000cc003');

-- Страница «Задачи филиала» — только Филиал.
select pg_temp.login('00000000-0000-0000-0000-0000000cc001');
insert into ids values ('p', public.create_page((select v from ids where k='A'), 'tasks', 'Задачи филиала',
  jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='f')))));

-- Участник с доступом получает список: владелец и сотрудник Филиала, по фамилии.
select pg_temp.login('00000000-0000-0000-0000-0000000cc002');
select pg_temp.ok((select array_agg(user_id order by ord) from (
                     select user_id, row_number() over () as ord
                     from public.get_page_people((select v from ids where k='p'))) x)
                  = array['00000000-0000-0000-0000-0000000cc002', '00000000-0000-0000-0000-0000000cc001']::uuid[],
  'сотрудник с доступом видит людей страницы, по фамилии (Абаев, Яковлев)');
select pg_temp.ok((select row(position, role)::text from public.get_page_people((select v from ids where k='p'))
                   where user_id = '00000000-0000-0000-0000-0000000cc002') = '(Кассир,employee)',
  'в списке есть должность и роль');
select pg_temp.ok((select count(*) = 0 from public.get_page_people((select v from ids where k='p'))
                   where user_id = '00000000-0000-0000-0000-0000000cc003'),
  'сотрудника Склада нет в списке');

-- Сотрудник той же компании без доступа — forbidden.
select pg_temp.login('00000000-0000-0000-0000-0000000cc003');
select pg_temp.fails(format('select * from public.get_page_people(%L)', (select v from ids where k='p')), 'forbidden',
  'сотрудник без доступа к странице получает отказ');

-- Пользователь другой компании — forbidden.
select pg_temp.login('00000000-0000-0000-0000-0000000cc009');
select pg_temp.fails(format('select * from public.get_page_people(%L)', (select v from ids where k='p')), 'forbidden',
  'владелец чужой компании получает отказ');

-- Несуществующая страница — forbidden (не раскрываем, есть ли она).
select pg_temp.login('00000000-0000-0000-0000-0000000cc002');
select pg_temp.fails(format('select * from public.get_page_people(%L)', gen_random_uuid()), 'forbidden',
  'неизвестная страница — отказ');

-- Без входа — нет права на функцию.
reset role;
set local role anon;
select pg_temp.fails(format('select * from public.get_page_people(%L)', (select v from ids where k='p')), 'permission denied',
  'anon не может вызвать функцию');

-- Owner без строки в page_access всё равно получает список.
reset role;
delete from public.page_access
where page_id = (select v from ids where k='p') and user_id = '00000000-0000-0000-0000-0000000cc001';
select pg_temp.login('00000000-0000-0000-0000-0000000cc001');
select pg_temp.ok((select count(*) = 1 from public.get_page_people((select v from ids where k='p'))),
  'Owner без строки в page_access получает список (1 человек — сотрудник Филиала)');

-- Архивная страница — список отдаётся, без ошибки.
select public.set_page_archived((select v from ids where k='p'), true);
select pg_temp.login('00000000-0000-0000-0000-0000000cc002');
select pg_temp.ok((select count(*) >= 1 from public.get_page_people((select v from ids where k='p'))),
  'архивная страница: список отдаётся для чтения');

reset role;
rollback;
