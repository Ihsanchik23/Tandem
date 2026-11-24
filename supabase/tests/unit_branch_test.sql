-- Tandem · тесты удаления ветки (миграция unit_branch_delete). Всё в транзакции, в конце откат.
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
grant all on ids to authenticated;

-- Люди: владелец A, админ A, менеджер A, сотрудники A, владелец чужой компании B.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000bb001'), ('00000000-0000-0000-0000-0000000bb002'),
  ('00000000-0000-0000-0000-0000000bb003'), ('00000000-0000-0000-0000-0000000bb004'),
  ('00000000-0000-0000-0000-0000000bb005'), ('00000000-0000-0000-0000-0000000bb009');
insert into public.subscriptions (owner_user_id, paid_until, seats) values
  ('00000000-0000-0000-0000-0000000bb001', now() + interval '30 days', 15),
  ('00000000-0000-0000-0000-0000000bb009', now() + interval '30 days', 15);

select pg_temp.login('00000000-0000-0000-0000-0000000bb001');
insert into ids values ('A', public.create_organization('Ветки А', 'branch-a'));
select pg_temp.login('00000000-0000-0000-0000-0000000bb009');
insert into ids values ('B', public.create_organization('Ветки Б', 'branch-b'));

reset role;
insert into public.memberships (organization_id, user_id, role) values
  ((select v from ids where k='A'), '00000000-0000-0000-0000-0000000bb002', 'admin'),
  ((select v from ids where k='A'), '00000000-0000-0000-0000-0000000bb003', 'manager'),
  ((select v from ids where k='A'), '00000000-0000-0000-0000-0000000bb004', 'employee'),
  ((select v from ids where k='A'), '00000000-0000-0000-0000-0000000bb005', 'employee');

-- Структура А: Филиал (→ Отдел → Касса), Склад, Пустое. Структура Б: Офис.
insert into ids values ('f', gen_random_uuid()), ('d', gen_random_uuid()), ('k', gen_random_uuid()),
  ('s', gen_random_uuid()), ('e', gen_random_uuid()), ('bo', gen_random_uuid());
insert into public.units (id, organization_id, parent_id, name) values
  ((select v from ids where k='f'), (select v from ids where k='A'), null, 'Филиал'),
  ((select v from ids where k='s'), (select v from ids where k='A'), null, 'Склад'),
  ((select v from ids where k='e'), (select v from ids where k='A'), null, 'Пустое'),
  ((select v from ids where k='bo'), (select v from ids where k='B'), null, 'Офис');
insert into public.units (id, organization_id, parent_id, name) values
  ((select v from ids where k='d'), (select v from ids where k='A'), (select v from ids where k='f'), 'Отдел');
insert into public.units (id, organization_id, parent_id, name) values
  ((select v from ids where k='k'), (select v from ids where k='A'), (select v from ids where k='d'), 'Касса');
-- Менеджер — в Филиале; сотрудник 4 — в Отделе и на Складе (два подразделения); сотрудник 5 — в Кассе.
insert into public.unit_members (organization_id, unit_id, user_id) values
  ((select v from ids where k='A'), (select v from ids where k='f'), '00000000-0000-0000-0000-0000000bb003'),
  ((select v from ids where k='A'), (select v from ids where k='d'), '00000000-0000-0000-0000-0000000bb004'),
  ((select v from ids where k='A'), (select v from ids where k='s'), '00000000-0000-0000-0000-0000000bb004'),
  ((select v from ids where k='A'), (select v from ids where k='k'), '00000000-0000-0000-0000-0000000bb005');

-- Страницы: только Отдел; Касса + Склад; только Склад.
select pg_temp.login('00000000-0000-0000-0000-0000000bb001');
insert into ids values ('p_only', public.create_page((select v from ids where k='A'), 'tasks', 'Только отдел',
  jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='d')))));
insert into ids values ('p_mixed', public.create_page((select v from ids where k='A'), 'chat', 'Касса и склад',
  jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='k')),
                    jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='s')))));
insert into ids values ('p_other', public.create_page((select v from ids where k='A'), 'tasks', 'Только склад',
  jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', (select v from ids where k='s')))));

-- Сводка: видит любой сотрудник компании.
select pg_temp.login('00000000-0000-0000-0000-0000000bb004');
select pg_temp.ok((select row(units_count, members_count, will_be_unassigned, pages_count, pages_to_archive)::text
                   from public.get_unit_branch_summary((select v from ids where k='f'))) = '(3,3,2,2,1)',
  'сводка ветки Филиал: 3 подразделения, 3 человека, 2 станут нераспределёнными, 2 страницы, 1 в архив');
select pg_temp.ok((select row(units_count, members_count, will_be_unassigned, pages_count, pages_to_archive)::text
                   from public.get_unit_branch_summary((select v from ids where k='e'))) = '(1,0,0,0,0)',
  'сводка пустой ветки: всё по нулям');

-- Чужая компания: ни сводки, ни удаления.
select pg_temp.login('00000000-0000-0000-0000-0000000bb009');
select pg_temp.fails(format('select * from public.get_unit_branch_summary(%L)', (select v from ids where k='f')), 'forbidden',
  'владелец чужой компании не видит сводку');
select pg_temp.fails(format('select * from public.delete_unit_branch(%L)', (select v from ids where k='f')), 'forbidden',
  'владелец чужой компании не может удалить ветку');

-- Manager и Employee удалять не могут.
select pg_temp.login('00000000-0000-0000-0000-0000000bb003');
select pg_temp.fails(format('select * from public.delete_unit_branch(%L)', (select v from ids where k='f')), 'forbidden', 'Manager не может удалить ветку');
select pg_temp.login('00000000-0000-0000-0000-0000000bb004');
select pg_temp.fails(format('select * from public.delete_unit_branch(%L)', (select v from ids where k='f')), 'forbidden', 'Employee не может удалить ветку');

-- Пустая ветка удаляется (Admin).
select pg_temp.login('00000000-0000-0000-0000-0000000bb002');
select pg_temp.ok((select row(units_deleted, pages_archived)::text from public.delete_unit_branch((select v from ids where k='e'))) = '(1,0)',
  'Admin удаляет пустое подразделение');

-- Ветка с вложенными, людьми и страницами (Owner).
select pg_temp.login('00000000-0000-0000-0000-0000000bb001');
select pg_temp.ok((select row(units_deleted, pages_archived)::text from public.delete_unit_branch((select v from ids where k='f'))) = '(3,1)',
  'Owner удаляет ветку из 3 уровней, 1 страница уходит в архив');
reset role;
select pg_temp.ok((select count(*) = 0 from public.units where id in (select v from ids where k in ('f','d','k'))), 'вся ветка удалена');
select pg_temp.ok((select count(*) = 1 from public.units where id = (select v from ids where k='s')), 'соседнее подразделение не тронуто');
select pg_temp.ok((select count(*) = 5 from public.memberships where organization_id = (select v from ids where k='A')),
  'все люди остались в компании');
select pg_temp.ok((select count(*) = 0 from public.unit_members where user_id in
  ('00000000-0000-0000-0000-0000000bb003', '00000000-0000-0000-0000-0000000bb005')), 'люди только из ветки — нераспределённые');
select pg_temp.ok((select array_agg(unit_id) = array[(select v from ids where k='s')] from public.unit_members
                   where user_id = '00000000-0000-0000-0000-0000000bb004'), 'человек из двух подразделений остался на Складе');
select pg_temp.ok((select status = 'archived' from public.pages where id = (select v from ids where k='p_only')), 'страница только ветки — в архиве');
select pg_temp.ok((select status = 'active' from public.pages where id = (select v from ids where k='p_mixed')), 'страница с другим подразделением — активна');
select pg_temp.ok((select count(*) = 1 from public.page_scopes where page_id = (select v from ids where k='p_mixed')), 'у неё осталась одна область (Склад)');
select pg_temp.ok((select status = 'active' from public.pages where id = (select v from ids where k='p_other')), 'чужая для ветки страница не тронута');
select pg_temp.ok((select count(*) = 1 from public.audit_log where action = 'unit.branch_deleted' and target_id = (select v from ids where k='f')),
  'удаление записано в журнал');

-- Истёкшая подписка: удалять нельзя.
update public.subscriptions set paid_until = now() - interval '1 day' where organization_id = (select v from ids where k='B');
select pg_temp.login('00000000-0000-0000-0000-0000000bb009');
select pg_temp.fails(format('select * from public.delete_unit_branch(%L)', (select v from ids where k='bo')), 'subscription_inactive',
  'при истёкшей подписке удалять нельзя');

reset role;
rollback;
