-- Tandem · доступ к странице подразделения вниз и вверх по дереву. Всё в транзакции, в конце откат.
-- Компания: Семей → Точка 1 (→ Касса), Точка 2; отдельная ветка Астана.
-- По одному сотруднику в каждом подразделении.
begin;

create temp table passed (n serial, msg text);
grant all on passed to authenticated, anon;
grant usage on sequence passed_n_seq to authenticated, anon;

create function pg_temp.login(p uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  insert into passed (msg) values (msg);
  raise notice 'ok  - %', msg;
end $$;

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated, anon;

-- Видит ли сотрудник страницу — от его имени, как в приложении (can_access_page).
create function pg_temp.sees(p_user uuid, p_page text) returns boolean language plpgsql as $$
declare r boolean;
begin
  perform pg_temp.login(p_user);
  r := public.can_access_page((select v from ids where k = p_page));
  reset role;
  return r;
end $$;

-- Люди: владелец ee01, сотрудники Семей ee02, Точка 1 ee03, Точка 2 ee04, Астана ee05, Касса ee06.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000ee001'), ('00000000-0000-0000-0000-0000000ee002'),
  ('00000000-0000-0000-0000-0000000ee003'), ('00000000-0000-0000-0000-0000000ee004'),
  ('00000000-0000-0000-0000-0000000ee005'), ('00000000-0000-0000-0000-0000000ee006');
insert into public.subscriptions (owner_user_id, paid_until, seats) values
  ('00000000-0000-0000-0000-0000000ee001', now() + interval '30 days', 15);

select pg_temp.login('00000000-0000-0000-0000-0000000ee001');
insert into ids values ('org', public.create_organization('Вверх и вниз', 'access-up-down'));

reset role;
insert into public.memberships (organization_id, user_id, role) values
  ((select v from ids where k='org'), '00000000-0000-0000-0000-0000000ee002', 'employee'),
  ((select v from ids where k='org'), '00000000-0000-0000-0000-0000000ee003', 'employee'),
  ((select v from ids where k='org'), '00000000-0000-0000-0000-0000000ee004', 'employee'),
  ((select v from ids where k='org'), '00000000-0000-0000-0000-0000000ee005', 'employee'),
  ((select v from ids where k='org'), '00000000-0000-0000-0000-0000000ee006', 'employee');
insert into ids values ('sem', gen_random_uuid()), ('t1', gen_random_uuid()), ('t2', gen_random_uuid()),
                       ('ast', gen_random_uuid()), ('kas', gen_random_uuid());
insert into public.units (id, organization_id, parent_id, name) values
  ((select v from ids where k='sem'), (select v from ids where k='org'), null, 'Семей'),
  ((select v from ids where k='ast'), (select v from ids where k='org'), null, 'Астана');
insert into public.units (id, organization_id, parent_id, name) values
  ((select v from ids where k='t1'), (select v from ids where k='org'), (select v from ids where k='sem'), 'Точка 1'),
  ((select v from ids where k='t2'), (select v from ids where k='org'), (select v from ids where k='sem'), 'Точка 2');
insert into public.units (id, organization_id, parent_id, name) values
  ((select v from ids where k='kas'), (select v from ids where k='org'), (select v from ids where k='t1'), 'Касса');
insert into public.unit_members (organization_id, unit_id, user_id) values
  ((select v from ids where k='org'), (select v from ids where k='sem'), '00000000-0000-0000-0000-0000000ee002'),
  ((select v from ids where k='org'), (select v from ids where k='t1'),  '00000000-0000-0000-0000-0000000ee003'),
  ((select v from ids where k='org'), (select v from ids where k='t2'),  '00000000-0000-0000-0000-0000000ee004'),
  ((select v from ids where k='org'), (select v from ids where k='ast'), '00000000-0000-0000-0000-0000000ee005'),
  ((select v from ids where k='org'), (select v from ids where k='kas'), '00000000-0000-0000-0000-0000000ee006');

-- По странице на каждое подразделение.
select pg_temp.login('00000000-0000-0000-0000-0000000ee001');
insert into ids values
  ('pSem', public.create_page((select v from ids where k='org'), 'tasks', 'Семей',
     jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='sem'))))),
  ('pT1', public.create_page((select v from ids where k='org'), 'tasks', 'Точка 1',
     jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='t1'))))),
  ('pT2', public.create_page((select v from ids where k='org'), 'tasks', 'Точка 2',
     jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='t2'))))),
  ('pAst', public.create_page((select v from ids where k='org'), 'tasks', 'Астана',
     jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='ast'))))),
  ('pKas', public.create_page((select v from ids where k='org'), 'tasks', 'Касса',
     jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='kas')))));
reset role;

-- Страница Семея: Семей и все дочерние (вниз — как раньше).
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee002', 'pSem'), 'страница Семея: видит сотрудник Семея');
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee003', 'pSem'), 'страница Семея: видит сотрудник Точки 1');
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee004', 'pSem'), 'страница Семея: видит сотрудник Точки 2');
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee006', 'pSem'), 'страница Семея: видит сотрудник Кассы (внук)');
select pg_temp.ok(not pg_temp.sees('00000000-0000-0000-0000-0000000ee005', 'pSem'), 'страница Семея: Астана не видит');

-- Страница Точки 1: Точка 1, её дочерние и родитель Семей (вверх — новое). Соседняя Точка 2 — нет.
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee003', 'pT1'), 'страница Точки 1: видит сотрудник Точки 1');
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee002', 'pT1'), 'страница Точки 1: видит сотрудник Семея (родитель)');
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee006', 'pT1'), 'страница Точки 1: видит сотрудник Кассы (дочернее)');
select pg_temp.ok(not pg_temp.sees('00000000-0000-0000-0000-0000000ee004', 'pT1'), 'страница Точки 1: соседняя Точка 2 не видит');
select pg_temp.ok(not pg_temp.sees('00000000-0000-0000-0000-0000000ee005', 'pT1'), 'страница Точки 1: Астана не видит');

-- Страница Точки 2 — симметрично.
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee002', 'pT2'), 'страница Точки 2: видит сотрудник Семея');
select pg_temp.ok(not pg_temp.sees('00000000-0000-0000-0000-0000000ee003', 'pT2'), 'страница Точки 2: Точка 1 не видит');
select pg_temp.ok(not pg_temp.sees('00000000-0000-0000-0000-0000000ee006', 'pT2'), 'страница Точки 2: Касса (другая ветка) не видит');

-- Страница Кассы (внук): вверх до корня — Точка 1 и Семей; Точка 2 и Астана — нет.
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee006', 'pKas'), 'страница Кассы: видит сотрудник Кассы');
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee003', 'pKas'), 'страница Кассы: видит Точка 1 (родитель)');
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee002', 'pKas'), 'страница Кассы: видит Семей (родитель родителя)');
select pg_temp.ok(not pg_temp.sees('00000000-0000-0000-0000-0000000ee004', 'pKas'), 'страница Кассы: Точка 2 не видит');
select pg_temp.ok(not pg_temp.sees('00000000-0000-0000-0000-0000000ee005', 'pKas'), 'страница Кассы: Астана не видит');

-- Отдельная ветка Астана ничего из Семея не видит, и наоборот.
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee005', 'pAst'), 'страница Астаны: видит сотрудник Астаны');
select pg_temp.ok(not pg_temp.sees('00000000-0000-0000-0000-0000000ee002', 'pAst'), 'страница Астаны: Семей не видит');
select pg_temp.ok(not pg_temp.sees('00000000-0000-0000-0000-0000000ee003', 'pAst'), 'страница Астаны: Точка 1 не видит');
select pg_temp.ok(not pg_temp.sees('00000000-0000-0000-0000-0000000ee004', 'pAst'), 'страница Астаны: Точка 2 не видит');
select pg_temp.ok((select count(*) from public.page_access
                   where user_id = '00000000-0000-0000-0000-0000000ee005'
                     and organization_id = (select v from ids where k='org')) = 1,
                  'сотрудник Астаны видит ровно одну страницу');

-- Owner видит всё.
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee001', 'pT2') and pg_temp.sees('00000000-0000-0000-0000-0000000ee001', 'pAst'),
                  'владелец видит все страницы');

-- Перенос ветки пересчитывает доступ вверх: Точку 2 переносим в Астану.
update public.units set parent_id = (select v from ids where k='ast') where id = (select v from ids where k='t2');
select pg_temp.ok(pg_temp.sees('00000000-0000-0000-0000-0000000ee005', 'pT2'), 'после переноса Точки 2 в Астану: Астана видит её страницу');
select pg_temp.ok(not pg_temp.sees('00000000-0000-0000-0000-0000000ee002', 'pT2'), 'после переноса: Семей больше не видит Точку 2');

select n, 'ok' as result, msg from passed order by n;
rollback;
