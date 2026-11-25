-- =====================================================================
-- Tandem · тесты прав (RLS и RPC)
-- Запуск: psql -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- или: supabase db query --linked -f supabase/tests/rls_test.sql
-- Всё выполняется в транзакции и откатывается в конце: данные не остаются.
-- Любая ошибка «FAIL: ...» означает дыру в правах.
-- =====================================================================
begin;

-- ---------- Помощники ----------
create function pg_temp.login(p uuid) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok  - %', msg;
end $$;

-- Ожидаем ошибку: p_expect — фрагмент текста ошибки или SQLSTATE.
create function pg_temp.fails(p_sql text, p_expect text, msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_expect || '%' or sqlstate = p_expect then
      raise notice 'ok  - %', msg;
      return;
    end if;
    raise exception 'FAIL: % (ошибка другая: % / %)', msg, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % (ошибки не было)', msg;
end $$;

-- Тестовые пользователи. Профили создаются триггером.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@t.kz',  '{"first_name":"Арман"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'emp1-a@t.kz',   '{}'),
  ('00000000-0000-0000-0000-0000000000a3', 'emp2-a@t.kz',   '{}'),
  ('00000000-0000-0000-0000-0000000000a4', 'manager-a@t.kz','{}'),
  ('00000000-0000-0000-0000-0000000000a5', 'admin-a@t.kz',  '{}'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@t.kz',  '{}'),
  ('00000000-0000-0000-0000-0000000000c1', 'outsider@t.kz', '{}'),
  ('00000000-0000-0000-0000-0000000000f1', 'platform@t.kz', '{}');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000f1');

create temp table ids (k text primary key, v text);
grant all on ids to authenticated, anon;
create function pg_temp.id(p text) returns uuid language sql as $$ select v::uuid from ids where k = p $$;
create function pg_temp.tok(p text) returns text language sql as $$ select v from ids where k = p $$;

select pg_temp.ok((select count(*) from public.profiles where id in (
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4',
  '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1'
)) = 8, 'профили создаются при регистрации');
select pg_temp.ok((select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 'Арман',
                  'имя из метаданных попадает в профиль');

-- ---------- Подписки ----------
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
select pg_temp.fails($$select public.admin_activate_subscription('00000000-0000-0000-0000-0000000000c1', now() + interval '30 days')$$,
                     'forbidden', 'обычный пользователь не может выдать себе подписку');
select pg_temp.fails($$select public.create_organization('Чужая', 'chuzhaya')$$,
                     'subscription_required', 'без подписки компанию не создать');

select pg_temp.login('00000000-0000-0000-0000-0000000000f1');
select public.admin_activate_subscription('00000000-0000-0000-0000-0000000000a1', now() + interval '30 days');
select public.admin_activate_subscription('00000000-0000-0000-0000-0000000000b1', now() + interval '30 days');

-- ---------- Компании ----------
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
insert into ids values ('orgA', public.create_organization('Магазин A', 'shop-a', 'Мужская одежда', 'Астана'));
insert into ids values ('tokA', public.create_invite(pg_temp.id('orgA')));

select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
insert into ids values ('orgB', public.create_organization('Компания B', 'company-b'));
insert into ids values ('tokB', public.create_invite(pg_temp.id('orgB')));
select pg_temp.fails($$select public.create_organization('Вторая', 'second-b')$$,
                     'already_member', 'вторую компанию создать нельзя');

-- ---------- Приглашения ----------
select pg_temp.logout();
set local role anon;
select pg_temp.ok((select is_valid from public.get_invite_preview(pg_temp.tok('tokA'))),
                  'предпросмотр приглашения доступен без входа');
select pg_temp.ok((select count(*) from public.profiles) = 0, 'без входа профили не видны');
select pg_temp.fails($$select public.accept_invite('x')$$, '42501', 'без входа вступить нельзя');

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select public.accept_invite(pg_temp.tok('tokA'));
select pg_temp.fails(format('select public.accept_invite(%L)', pg_temp.tok('tokA')),
                     'already_member_here', 'повторное вступление отклоняется');
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select public.accept_invite(pg_temp.tok('tokA'));
select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
select public.accept_invite(pg_temp.tok('tokA'));
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select public.accept_invite(pg_temp.tok('tokA'));
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.fails(format('select public.accept_invite(%L)', pg_temp.tok('tokA')),
                     'already_member', 'участник другой компании не может вступить (пилот)');
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
select pg_temp.fails($$select public.accept_invite('neverexisted')$$, 'invite_invalid', 'несуществующая ссылка отклоняется');

-- ---------- Роли ----------
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.set_member_role(pg_temp.id('orgA'), '00000000-0000-0000-0000-0000000000a4', 'manager');
select public.set_member_role(pg_temp.id('orgA'), '00000000-0000-0000-0000-0000000000a5', 'admin');
select pg_temp.fails(format('select public.set_member_role(%L, %L, %L)', pg_temp.id('orgA'),
                     '00000000-0000-0000-0000-0000000000a2', 'owner'),
                     'invalid_role', 'роль Owner назначить нельзя');

select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select pg_temp.fails(format('select public.set_member_role(%L, %L, %L)', pg_temp.id('orgA'),
                     '00000000-0000-0000-0000-0000000000a2', 'admin'),
                     'forbidden', 'Admin не может назначить другого Admin');
select pg_temp.fails(format('select public.remove_member(%L, %L)', pg_temp.id('orgA'),
                     '00000000-0000-0000-0000-0000000000a1'),
                     'forbidden', 'Admin не может удалить Owner');

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select pg_temp.fails(format('select public.set_member_role(%L, %L, %L)', pg_temp.id('orgA'),
                     '00000000-0000-0000-0000-0000000000a2', 'admin'),
                     'forbidden', 'сотрудник не может повысить себя');
update public.memberships set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a2';
select pg_temp.ok((select role from public.memberships where user_id = '00000000-0000-0000-0000-0000000000a2') = 'employee',
                  'роль сотрудника не изменилась');

-- ---------- Структура ----------
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
with created as (
  insert into public.units (organization_id, name) values (pg_temp.id('orgA'), 'Филиал Астана')
  returning id
)
insert into ids select 'uA', id::text from created;
with created as (
  insert into public.units (organization_id, parent_id, name)
  values (pg_temp.id('orgA'), pg_temp.id('uA'), 'Склад Астана')
  returning id
)
insert into ids select 'uA1', id::text from created;
with created as (
  insert into public.units (organization_id, name) values (pg_temp.id('orgA'), 'Филиал Алматы')
  returning id
)
insert into ids select 'uB', id::text from created;
insert into public.unit_members (organization_id, unit_id, user_id) values
  (pg_temp.id('orgA'), pg_temp.id('uA1'), '00000000-0000-0000-0000-0000000000a2'),
  (pg_temp.id('orgA'), pg_temp.id('uB'),  '00000000-0000-0000-0000-0000000000a3'),
  (pg_temp.id('orgA'), pg_temp.id('uA'),  '00000000-0000-0000-0000-0000000000a4');

select pg_temp.fails(format('update public.units set parent_id = %L where id = %L', pg_temp.id('uA1'), pg_temp.id('uA')),
                     'unit_cycle', 'цикл в дереве подразделений запрещён');
select pg_temp.fails(format('insert into public.units (organization_id, name) values (%L, %L)', pg_temp.id('orgA'), 'филиал астана'),
                     '23505', 'одинаковые имена у одного родителя запрещены');
select pg_temp.fails(format('insert into public.unit_members (organization_id, unit_id, user_id) values (%L, %L, %L)',
                     pg_temp.id('orgA'), pg_temp.id('uA'), '00000000-0000-0000-0000-0000000000c1'),
                     '23503', 'в подразделение нельзя добавить не-сотрудника');

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select pg_temp.fails(format('insert into public.units (organization_id, name) values (%L, %L)', pg_temp.id('orgA'), 'Мой отдел'),
                     '42501', 'сотрудник не может создавать подразделения');

-- ---------- Страницы и доступ ----------
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
insert into ids values ('pAst', public.create_page(pg_temp.id('orgA'), 'tasks', 'Задачи Астана',
  jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', pg_temp.id('uA')))));
insert into ids values ('pAll', public.create_page(pg_temp.id('orgA'), 'chat', 'Общий чат',
  '[{"kind":"organization"}]'::jsonb));
insert into ids values ('pPriv', public.create_page(pg_temp.id('orgA'), 'tasks', 'Лично Айдару',
  jsonb_build_array(jsonb_build_object('kind', 'user', 'user_id', '00000000-0000-0000-0000-0000000000a3'))));
select pg_temp.fails(format('select public.create_page(%L, %L, %L, %L::jsonb)', pg_temp.id('orgA'), 'tasks', 'Без Scope', '[]'),
                     'scope_required', 'страница без Scope не создаётся');
select pg_temp.fails(format('select public.create_page(%L, %L, %L, %L::jsonb)', pg_temp.id('orgA'), 'attendance', 'Отметки',
                     '[{"kind":"organization"}]'),
                     'module_unavailable', 'модуль компании нельзя создать как страницу');

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select pg_temp.ok(public.can_access_page(pg_temp.id('pAst')), 'сотрудник дочернего подразделения видит страницу родителя');
select pg_temp.ok(public.can_access_page(pg_temp.id('pAll')), 'сотрудник видит страницу всей компании');
select pg_temp.ok(not public.can_access_page(pg_temp.id('pPriv')), 'сотрудник не видит чужую личную страницу');
select pg_temp.ok((select count(*) from public.pages where organization_id = pg_temp.id('orgA')) = 3,
                  'метаданные всех страниц видны (Canvas с замками)');
select pg_temp.fails(format('insert into public.page_access (organization_id, page_id, user_id) values (%L, %L, %L)',
                     pg_temp.id('orgA'), pg_temp.id('pPriv'), '00000000-0000-0000-0000-0000000000a2'),
                     '42501', 'выдать себе доступ напрямую нельзя');
select pg_temp.fails(format('select public.recompute_page_access(%L)', pg_temp.id('orgA')),
                     '42501', 'внутренние функции недоступны клиенту');
select pg_temp.fails(format('select public.create_page(%L, %L, %L, %L::jsonb)', pg_temp.id('orgA'), 'tasks', 'Моя', '[{"kind":"organization"}]'),
                     'forbidden', 'сотрудник не создаёт страницы');

select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select pg_temp.ok(not public.can_access_page(pg_temp.id('pAst')), 'сотрудник другого филиала не видит страницу Астаны');
select pg_temp.ok(public.can_access_page(pg_temp.id('pPriv')), 'адресат личной страницы её видит');

select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select pg_temp.ok(public.can_access_page(pg_temp.id('pPriv')), 'Admin видит все страницы');

-- Manager: только свои подразделения
select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
select pg_temp.ok(public.can_access_page(pg_temp.id('pAst')), 'Manager видит страницу своего филиала');
insert into ids values ('pMgr', public.create_page(pg_temp.id('orgA'), 'tasks', 'Склад: задачи',
  jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', pg_temp.id('uA1')))));
select pg_temp.fails(format('select public.create_page(%L, %L, %L, %L::jsonb)', pg_temp.id('orgA'), 'tasks', 'Всем', '[{"kind":"organization"}]'),
                     'forbidden', 'Manager не создаёт страницу на всю компанию');
select pg_temp.fails(format('select public.create_page(%L, %L, %L, %s)', pg_temp.id('orgA'), 'tasks', 'Алматы',
                     quote_literal(jsonb_build_array(jsonb_build_object('kind','unit','unit_id', pg_temp.id('uB')))::text) || '::jsonb'),
                     'forbidden', 'Manager не создаёт страницу чужого филиала');
select pg_temp.fails(format('select public.set_page_archived(%L, true)', pg_temp.id('pAst')),
                     'forbidden', 'Manager не архивирует чужую страницу');
select public.set_page_archived(pg_temp.id('pMgr'), true);
select pg_temp.ok((select status from public.pages where id = pg_temp.id('pMgr')) = 'archived', 'Manager архивирует свою страницу');

-- Смена Scope пересчитывает доступ
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.update_page_scope(pg_temp.id('pAst'),
  jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', pg_temp.id('uB'))));
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select pg_temp.ok(not public.can_access_page(pg_temp.id('pAst')), 'после смены Scope доступ пропадает');
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select pg_temp.ok(public.can_access_page(pg_temp.id('pAst')), 'после смены Scope доступ появляется');

-- Перевод между подразделениями пересчитывает доступ
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
delete from public.unit_members where unit_id = pg_temp.id('uB') and user_id = '00000000-0000-0000-0000-0000000000a3';
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select pg_temp.ok(not public.can_access_page(pg_temp.id('pAst')), 'убрали из филиала — доступ пропал');

-- ---------- Изоляция компаний ----------
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.ok((select count(*) from public.units where organization_id = pg_temp.id('orgA')) = 0, 'компания B не видит подразделения A');
select pg_temp.ok((select count(*) from public.pages where organization_id = pg_temp.id('orgA')) = 0, 'компания B не видит страницы A');
select pg_temp.ok((select count(*) from public.page_scopes where organization_id = pg_temp.id('orgA')) = 0, 'компания B не видит Scope A');
select pg_temp.ok((select count(*) from public.unit_members where organization_id = pg_temp.id('orgA')) = 0, 'компания B не видит состав подразделений A');
select pg_temp.ok((select count(*) from public.invites where organization_id = pg_temp.id('orgA')) = 0, 'компания B не видит приглашения A');
select pg_temp.ok((select count(*) from public.audit_log where organization_id = pg_temp.id('orgA')) = 0, 'компания B не видит журнал A');
select pg_temp.ok(not public.can_access_page(pg_temp.id('pAll')), 'компания B не имеет доступа к странице A');
select pg_temp.fails(format('insert into public.units (organization_id, name) values (%L, %L)', pg_temp.id('orgA'), 'Взлом'),
                     '42501', 'компания B не может создать подразделение в A');
select pg_temp.fails(format('select public.create_page(%L, %L, %L, %L::jsonb)', pg_temp.id('orgA'), 'tasks', 'Взлом', '[{"kind":"organization"}]'),
                     'forbidden', 'компания B не может создать страницу в A');
select pg_temp.fails(format('select public.create_invite(%L)', pg_temp.id('orgA')),
                     'forbidden', 'компания B не может создать приглашение в A');
update public.organizations set name = 'Взлом' where id = pg_temp.id('orgA');
select pg_temp.ok((select name from public.organizations where id = pg_temp.id('orgA')) = 'Магазин A', 'компания B не может переименовать A');
select pg_temp.ok((select count(*) from public.memberships where organization_id = pg_temp.id('orgA')) = 5,
                  'публичный список сотрудников A виден (профиль компании)');

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select pg_temp.ok((select count(*) from public.subscriptions) = 0, 'сотрудник не видит подписку');
select pg_temp.ok((select count(*) from public.invites) = 0, 'сотрудник не видит приглашения');

-- ---------- Выход из компании ----------
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select pg_temp.fails('select public.leave_organization()', 'owner_cannot_leave', 'Owner не может выйти');
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select public.leave_organization();
select pg_temp.ok(not public.can_access_page(pg_temp.id('pAll')), 'вышедший сотрудник теряет доступ');
select pg_temp.ok((select count(*) from public.units) = 0, 'вышедший сотрудник не видит структуру');

-- ---------- Лимит мест ----------
select pg_temp.logout();
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000010' || lpad(g::text, 2, '0'))::uuid, 'b' || g || '@t.kz'
from generate_series(1, 15) g;
do $$
declare g int;
begin
  for g in 1..14 loop
    perform pg_temp.login(('00000000-0000-0000-0000-0000000010' || lpad(g::text, 2, '0'))::uuid);
    perform public.accept_invite(pg_temp.tok('tokB'));
  end loop;
  perform pg_temp.logout();
end $$;
select pg_temp.login('00000000-0000-0000-0000-000000001015');
select pg_temp.fails(format('select public.accept_invite(%L)', pg_temp.tok('tokB')),
                     'no_free_seats', '16-й сотрудник не проходит при 15 местах');

-- ---------- Истёкшая подписка: только чтение ----------
select pg_temp.logout();
update public.subscriptions set paid_until = now() - interval '1 day'
where organization_id = (select v::uuid from ids where k = 'orgA');
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select pg_temp.ok((select count(*) from public.units where organization_id = pg_temp.id('orgA')) = 3, 'после истечения данные читаются');
select pg_temp.fails(format('insert into public.units (organization_id, name) values (%L, %L)', pg_temp.id('orgA'), 'Новый'),
                     '42501', 'после истечения нельзя менять структуру');
select pg_temp.fails(format('select public.create_page(%L, %L, %L, %L::jsonb)', pg_temp.id('orgA'), 'tasks', 'Новая', '[{"kind":"organization"}]'),
                     'subscription_inactive', 'после истечения нельзя создавать страницы');
select pg_temp.fails(format('select public.create_invite(%L)', pg_temp.id('orgA')),
                     'subscription_inactive', 'после истечения нельзя приглашать');

select pg_temp.logout();
select '===== ВСЕ ТЕСТЫ ПРОЙДЕНЫ =====' as result;
rollback;
