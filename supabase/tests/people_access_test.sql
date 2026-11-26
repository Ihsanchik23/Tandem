-- Tandem · тесты move_unit_member, grant_page_user, revoke_page_user. Всё в транзакции, в конце откат.
begin;

-- Пройденные проверки — итог выводится в конце (notice видны не во всех клиентах).
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
create function pg_temp.fails(p_sql text, p_expect text, msg text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_expect || '%' then insert into passed (msg) values (msg); raise notice 'ok  - %', msg; return; end if;
    raise exception 'FAIL: % (%)', msg, sqlerrm;
  end;
  raise exception 'FAIL: % (ошибки не было)', msg;
end $$;
create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated, anon;

-- Проверки после reset role (page_access, unit_members, audit_log видны целиком).
create function pg_temp.in_unit(p_user text, p_unit text) returns boolean language sql as $$
  select exists (select 1 from public.unit_members where user_id = p_user::uuid and unit_id = (select v from ids where k = p_unit));
$$;
create function pg_temp.has_access(p_user text, p_page text) returns boolean language sql as $$
  select exists (select 1 from public.page_access where user_id = p_user::uuid and page_id = (select v from ids where k = p_page));
$$;

-- Компания A: владелец dd01, админ dd02, менеджер dd03 (Филиал), сотрудник dd04 (Филиал), сотрудник dd05 (Склад).
-- Компания B: владелец dd09, сотрудник dd10.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000dd001'), ('00000000-0000-0000-0000-0000000dd002'),
  ('00000000-0000-0000-0000-0000000dd003'), ('00000000-0000-0000-0000-0000000dd004'),
  ('00000000-0000-0000-0000-0000000dd005'), ('00000000-0000-0000-0000-0000000dd009'),
  ('00000000-0000-0000-0000-0000000dd010');
insert into public.subscriptions (owner_user_id, paid_until, seats) values
  ('00000000-0000-0000-0000-0000000dd001', now() + interval '30 days', 15),
  ('00000000-0000-0000-0000-0000000dd009', now() + interval '30 days', 15);

select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
insert into ids values ('A', public.create_organization('Доступ А', 'access-a'));
select pg_temp.login('00000000-0000-0000-0000-0000000dd009');
insert into ids values ('B', public.create_organization('Доступ Б', 'access-b'));

reset role;
insert into public.memberships (organization_id, user_id, role) values
  ((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd002', 'admin'),
  ((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd003', 'manager'),
  ((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd004', 'employee'),
  ((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd005', 'employee'),
  ((select v from ids where k='B'), '00000000-0000-0000-0000-0000000dd010', 'employee');
insert into ids values ('f', gen_random_uuid()), ('s', gen_random_uuid()), ('k', gen_random_uuid()), ('bu', gen_random_uuid());
insert into public.units (id, organization_id, parent_id, name) values
  ((select v from ids where k='f'), (select v from ids where k='A'), null, 'Филиал'),
  ((select v from ids where k='s'), (select v from ids where k='A'), null, 'Склад'),
  ((select v from ids where k='k'), (select v from ids where k='A'), (select v from ids where k='f'), 'Касса'),
  ((select v from ids where k='bu'), (select v from ids where k='B'), null, 'Офис Б');
insert into public.unit_members (organization_id, unit_id, user_id) values
  ((select v from ids where k='A'), (select v from ids where k='f'), '00000000-0000-0000-0000-0000000dd003'),
  ((select v from ids where k='A'), (select v from ids where k='f'), '00000000-0000-0000-0000-0000000dd004'),
  ((select v from ids where k='A'), (select v from ids where k='s'), '00000000-0000-0000-0000-0000000dd005');

-- Страница P (владелец) — для Филиала; страница R — только для dd05; страница Q (менеджер) — для Филиала.
select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
insert into ids values ('P', public.create_page((select v from ids where k='A'), 'tasks', 'Задачи филиала',
  jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='f')))));
insert into ids values ('R', public.create_page((select v from ids where k='A'), 'tasks', 'Личная',
  jsonb_build_array(jsonb_build_object('kind', 'user', 'user_id', '00000000-0000-0000-0000-0000000dd005'))));
select pg_temp.login('00000000-0000-0000-0000-0000000dd003');
insert into ids values ('Q', public.create_page((select v from ids where k='A'), 'tasks', 'Задачи менеджера',
  jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='f')))));

-- ===================== move_unit_member =====================
reset role;
select pg_temp.ok(pg_temp.has_access('00000000-0000-0000-0000-0000000dd004', 'P'), 'до перевода: сотрудник Филиала видит страницу Филиала');

select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
select public.move_unit_member((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd004',
  (select v from ids where k='s'), (select v from ids where k='f'));
reset role;
select pg_temp.ok(pg_temp.in_unit('00000000-0000-0000-0000-0000000dd004', 's')
  and not pg_temp.in_unit('00000000-0000-0000-0000-0000000dd004', 'f'), 'владелец переводит Филиал → Склад одним действием');
select pg_temp.ok(not pg_temp.has_access('00000000-0000-0000-0000-0000000dd004', 'P'), 'после перевода доступ к странице Филиала пропал (пересчёт)');

-- Без p_from — убирает из всех остальных; админ тоже может.
insert into public.unit_members (organization_id, unit_id, user_id) values
  ((select v from ids where k='A'), (select v from ids where k='k'), '00000000-0000-0000-0000-0000000dd005');
select pg_temp.login('00000000-0000-0000-0000-0000000dd002');
select public.move_unit_member((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd005', (select v from ids where k='f'));
reset role;
select pg_temp.ok(pg_temp.in_unit('00000000-0000-0000-0000-0000000dd005', 'f')
  and not pg_temp.in_unit('00000000-0000-0000-0000-0000000dd005', 's')
  and not pg_temp.in_unit('00000000-0000-0000-0000-0000000dd005', 'k'), 'админ: без «откуда» — убираем из всех прежних');
select pg_temp.ok(pg_temp.has_access('00000000-0000-0000-0000-0000000dd005', 'P'), 'после перевода в Филиал доступ появился');

-- Перевод в то же подразделение ничего не ломает.
select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
select public.move_unit_member((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd005',
  (select v from ids where k='f'), (select v from ids where k='f'));
reset role;
select pg_temp.ok(pg_temp.in_unit('00000000-0000-0000-0000-0000000dd005', 'f'), 'перевод «в то же место» — человек остаётся');
select pg_temp.ok(exists (select 1 from public.audit_log where action = 'unit_member.moved' and organization_id = (select v from ids where k='A')),
  'перевод записан в журнал');

select pg_temp.login('00000000-0000-0000-0000-0000000dd004');
select pg_temp.fails($$select public.move_unit_member((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd004',
  (select v from ids where k='f'))$$, 'forbidden', 'сотрудник не может переводить (даже себя)');
select pg_temp.login('00000000-0000-0000-0000-0000000dd003');
select pg_temp.fails($$select public.move_unit_member((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd004',
  (select v from ids where k='f'))$$, 'forbidden', 'менеджер не может переводить');
select pg_temp.login('00000000-0000-0000-0000-0000000dd009');
select pg_temp.fails($$select public.move_unit_member((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd004',
  (select v from ids where k='f'))$$, 'forbidden', 'владелец компании B не может переводить людей компании A');
select pg_temp.fails($$select public.move_unit_member((select v from ids where k='B'), '00000000-0000-0000-0000-0000000dd004',
  (select v from ids where k='f'))$$, 'not_found', 'нельзя подставить подразделение чужой компании');
select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
select pg_temp.fails($$select public.move_unit_member((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd004',
  (select v from ids where k='bu'))$$, 'not_found', 'владелец A не может перевести в подразделение компании B');
select pg_temp.fails($$select public.move_unit_member((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd004',
  (select v from ids where k='f'), (select v from ids where k='bu'))$$, 'not_found', '«откуда» из чужой компании — отказ');
select pg_temp.fails($$select public.move_unit_member((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd010',
  (select v from ids where k='f'))$$, 'not_member', 'нельзя добавить человека не из компании');

-- ===================== grant_page_user =====================
select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
select public.grant_page_user((select v from ids where k='P'), '00000000-0000-0000-0000-0000000dd004');
select public.grant_page_user((select v from ids where k='P'), '00000000-0000-0000-0000-0000000dd004'); -- повтор без ошибки
reset role;
select pg_temp.ok(pg_temp.has_access('00000000-0000-0000-0000-0000000dd004', 'P'), 'владелец даёт индивидуальный доступ — доступ появился');
select pg_temp.ok((select count(*) from public.page_scopes where page_id = (select v from ids where k='P')) = 2,
  'остальной Scope не тронут, повтор не создаёт дубль');

select pg_temp.login('00000000-0000-0000-0000-0000000dd004');
select pg_temp.fails($$select public.grant_page_user((select v from ids where k='R'), '00000000-0000-0000-0000-0000000dd004')$$,
  'forbidden', 'сотрудник не может дать себе доступ к чужой странице');
select pg_temp.login('00000000-0000-0000-0000-0000000dd009');
select pg_temp.fails($$select public.grant_page_user((select v from ids where k='P'), '00000000-0000-0000-0000-0000000dd010')$$,
  'forbidden', 'владелец компании B не может дать доступ к странице компании A');
select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
select pg_temp.fails($$select public.grant_page_user((select v from ids where k='P'), '00000000-0000-0000-0000-0000000dd010')$$,
  'not_member', 'нельзя дать доступ человеку не из компании');

-- Менеджер: только свои страницы и только людям из своих подразделений.
select pg_temp.login('00000000-0000-0000-0000-0000000dd003');
select pg_temp.fails($$select public.grant_page_user((select v from ids where k='P'), '00000000-0000-0000-0000-0000000dd005')$$,
  'forbidden', 'менеджер не меняет доступ к странице, которую создал не он');
select public.grant_page_user((select v from ids where k='Q'), '00000000-0000-0000-0000-0000000dd005');
reset role;
select pg_temp.ok(exists (select 1 from public.page_scopes where page_id = (select v from ids where k='Q') and user_id = '00000000-0000-0000-0000-0000000dd005'),
  'менеджер даёт доступ к своей странице человеку из своего подразделения');
update public.unit_members set unit_id = (select v from ids where k='s')
  where user_id = '00000000-0000-0000-0000-0000000dd004';
select pg_temp.login('00000000-0000-0000-0000-0000000dd003');
select pg_temp.fails($$select public.grant_page_user((select v from ids where k='Q'), '00000000-0000-0000-0000-0000000dd004')$$,
  'forbidden', 'менеджер не даёт доступ человеку не из своих подразделений');

-- ===================== revoke_page_user =====================
select pg_temp.login('00000000-0000-0000-0000-0000000dd004');
select pg_temp.fails($$select public.revoke_page_user((select v from ids where k='P'), '00000000-0000-0000-0000-0000000dd004')$$,
  'forbidden', 'сотрудник не может забирать доступ');
select pg_temp.login('00000000-0000-0000-0000-0000000dd009');
select pg_temp.fails($$select public.revoke_page_user((select v from ids where k='P'), '00000000-0000-0000-0000-0000000dd004')$$,
  'forbidden', 'владелец компании B не может забрать доступ в компании A');
select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
select public.revoke_page_user((select v from ids where k='P'), '00000000-0000-0000-0000-0000000dd004');
reset role;
select pg_temp.ok(not pg_temp.has_access('00000000-0000-0000-0000-0000000dd004', 'P'), 'владелец забрал индивидуальный доступ — доступ пропал');
select pg_temp.ok(exists (select 1 from public.page_scopes where page_id = (select v from ids where k='P') and kind = 'unit'),
  'доступ подразделения остался');
select pg_temp.ok(exists (select 1 from public.audit_log where action = 'page.user_revoked'), 'изменение доступа записано в журнал');

select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
select pg_temp.fails($$select public.revoke_page_user((select v from ids where k='R'), '00000000-0000-0000-0000-0000000dd005')$$,
  'scope_required', 'последнюю область страницы убрать нельзя');

-- Истекла подписка — ничего менять нельзя.
reset role;
update public.subscriptions set paid_until = now() - interval '1 day' where owner_user_id = '00000000-0000-0000-0000-0000000dd001';
select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
select pg_temp.fails($$select public.move_unit_member((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd004',
  (select v from ids where k='f'))$$, 'subscription_inactive', 'подписка истекла: перевод запрещён');
select pg_temp.fails($$select public.grant_page_user((select v from ids where k='P'), '00000000-0000-0000-0000-0000000dd004')$$,
  'subscription_inactive', 'подписка истекла: доступ не выдаётся');
select pg_temp.fails($$select public.revoke_page_user((select v from ids where k='R'), '00000000-0000-0000-0000-0000000dd005')$$,
  'subscription_inactive', 'подписка истекла: доступ не забирается');

-- Анонимный вызов закрыт.
reset role;
set local role anon;
select pg_temp.fails($$select public.grant_page_user((select v from ids where k='P'), '00000000-0000-0000-0000-0000000dd004')$$,
  'permission denied', 'аноним не может вызывать функции');

reset role;
select n, 'ok' as result, msg from passed order by n;
rollback;
