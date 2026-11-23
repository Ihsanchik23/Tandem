-- =====================================================================
-- Tandem · тесты модулей: задачи, чат, отметки, поиск, хранилище
-- Всё в транзакции, в конце откат.
-- =====================================================================
begin;

create function pg_temp.login(p uuid) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claims', '', true); end $$;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok  - %', msg;
end $$;
create function pg_temp.fails(p_sql text, p_expect text, msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_expect || '%' or sqlstate = p_expect then
      raise notice 'ok  - %', msg; return;
    end if;
    raise exception 'FAIL: % (ошибка другая: % / %)', msg, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % (ошибки не было)', msg;
end $$;

create temp table ids (k text primary key, v text);
grant all on ids to authenticated, anon;
create function pg_temp.id(p text) returns uuid language sql as $$ select v::uuid from ids where k = p $$;

-- Пользователи: o — владелец, e1 — Астана, e2 — Алматы, m — менеджер Астаны, x — владелец другой компании, p — платформа
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', '{"first_name":"Арман","last_name":"Сеитов"}'),
  ('00000000-0000-0000-0000-000000000002', '{"first_name":"Айдар"}'),
  ('00000000-0000-0000-0000-000000000003', '{"first_name":"Дана"}'),
  ('00000000-0000-0000-0000-000000000004', '{"first_name":"Марат"}'),
  ('00000000-0000-0000-0000-000000000005', '{"first_name":"Чужой"}'),
  ('00000000-0000-0000-0000-000000000009', '{}');
insert into public.platform_admins values ('00000000-0000-0000-0000-000000000009');
insert into ids values
  ('o', '00000000-0000-0000-0000-000000000001'), ('e1', '00000000-0000-0000-0000-000000000002'),
  ('e2', '00000000-0000-0000-0000-000000000003'), ('m', '00000000-0000-0000-0000-000000000004'),
  ('x', '00000000-0000-0000-0000-000000000005');

select pg_temp.login('00000000-0000-0000-0000-000000000009');
select public.admin_activate_subscription(pg_temp.id('o'), now() + interval '30 days');
select public.admin_activate_subscription(pg_temp.id('x'), now() + interval '30 days');

select pg_temp.login(pg_temp.id('x'));
insert into ids values ('orgX', public.create_organization('Чужая компания', 'other-co'));

select pg_temp.login(pg_temp.id('o'));
insert into ids values ('org', public.create_organization('Магазин мужской одежды', 'menswear', null, 'Астана'));
insert into ids values ('tok', public.create_invite(pg_temp.id('org')));
select pg_temp.login(pg_temp.id('e1')); select public.accept_invite((select v from ids where k = 'tok'));
select pg_temp.login(pg_temp.id('e2')); select public.accept_invite((select v from ids where k = 'tok'));
select pg_temp.login(pg_temp.id('m'));  select public.accept_invite((select v from ids where k = 'tok'));

select pg_temp.login(pg_temp.id('o'));
select public.set_member_role(pg_temp.id('org'), pg_temp.id('m'), 'manager');
insert into public.units (organization_id, name, lat, lng, radius_m)
values (pg_temp.id('org'), 'Филиал Астана', 51.128, 71.430, 50) returning id \gset ast_
insert into ids values ('ast', :'ast_id');
insert into public.units (organization_id, name) values (pg_temp.id('org'), 'Филиал Алматы') returning id \gset alm_
insert into ids values ('alm', :'alm_id');
insert into public.unit_members (organization_id, unit_id, user_id) values
  (pg_temp.id('org'), pg_temp.id('ast'), pg_temp.id('e1')),
  (pg_temp.id('org'), pg_temp.id('alm'), pg_temp.id('e2')),
  (pg_temp.id('org'), pg_temp.id('ast'), pg_temp.id('m'));
insert into ids values ('pTasks', public.create_page(pg_temp.id('org'), 'tasks', 'Задачи Астаны',
  jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', pg_temp.id('ast')))));
insert into ids values ('pChat', public.create_page(pg_temp.id('org'), 'chat', 'Общий чат', '[{"kind":"organization"}]'));

-- =================== ЗАДАЧИ ===================
select pg_temp.login(pg_temp.id('e1'));
insert into ids values ('t0', public.create_task(pg_temp.id('pTasks'), 'Выложить новую коллекцию', 'Витрина у входа', now() + interval '1 day'));
select pg_temp.ok((select assignee_id is null from public.tasks where id = pg_temp.id('t0')), 'задачу можно создать без ответственного');
select pg_temp.fails(format('select public.create_task(%L, %L, %L, now() + interval ''1 day'', ''normal'', %L)',
  pg_temp.id('pTasks'), 'Себе', 'Текст', pg_temp.id('e1')), 'self_assign_forbidden', 'при создании нельзя назначить себя (ТЗ)');
select pg_temp.fails(format('select public.create_task(%L, %L, %L, now() - interval ''1 hour'')',
  pg_temp.id('pTasks'), 'Прошлое', 'Текст'), 'due_in_past', 'дедлайн в прошлом не принимается');
select pg_temp.fails(format('select public.create_task(%L, %L, %L, now() + interval ''1 day'')',
  pg_temp.id('pTasks'), '   ', 'Текст'), '23514', 'пустое название не принимается');
select pg_temp.fails(format('select public.create_task(%L, %L, %L, now() + interval ''1 day'', ''normal'', %L)',
  pg_temp.id('pTasks'), 'Алматы', 'Текст', pg_temp.id('e2')), 'assignee_no_access', 'нельзя назначить человека без доступа к странице');
select pg_temp.fails(format('insert into public.tasks (organization_id, page_id, title, description, due_at) values (%L, %L, %L, %L, now() + interval ''1 day'')',
  pg_temp.id('org'), pg_temp.id('pTasks'), 'Напрямую', 'x'), '42501', 'вставить задачу напрямую в таблицу нельзя');

select pg_temp.login(pg_temp.id('e2'));
select pg_temp.ok((select count(*) from public.tasks) = 0, 'сотрудник Алматы не видит задачи Астаны');
select pg_temp.fails(format('select public.create_task(%L, %L, %L, now() + interval ''1 day'')',
  pg_temp.id('pTasks'), 'Чужая', 'x'), 'page_unavailable', 'сотрудник без доступа не создаёт задачу');

select pg_temp.login(pg_temp.id('o'));
insert into ids values ('t1', public.create_task(pg_temp.id('pTasks'), 'Инвентаризация', 'Пересчитать склад',
  now() + interval '2 days', 'high', pg_temp.id('e1'), array[pg_temp.id('m')]));

select pg_temp.login(pg_temp.id('e1'));
select pg_temp.ok(public.set_task_status(pg_temp.id('t1'), 'in_progress') = 2, 'ответственный меняет статус');
select pg_temp.fails(format('select public.update_task(%L, 2, %L, %L, now() + interval ''3 days'', ''low'')',
  pg_temp.id('t1'), 'Новое', 'Новое'), 'forbidden', 'ответственный-сотрудник не меняет поля чужой задачи');
insert into ids values ('c1', public.add_task_comment(pg_temp.id('t1'), 'Начал с обуви'));
select public.edit_task_comment(pg_temp.id('c1'), 'Начал с обуви и сумок');

select pg_temp.login(pg_temp.id('m'));
select pg_temp.ok(public.update_task(pg_temp.id('t1'), 2, 'Инвентаризация склада', 'Пересчитать всё',
  now() + interval '3 days', 'urgent') = 3, 'Manager с доступом меняет поля задачи');
select pg_temp.fails(format('select public.edit_task_comment(%L, %L)', pg_temp.id('c1'), 'Чужой текст'),
  'forbidden', 'чужой комментарий не редактируется');

select pg_temp.login(pg_temp.id('o'));
select pg_temp.fails(format('select public.update_task(%L, 2, %L, %L, now() + interval ''3 days'', ''low'')',
  pg_temp.id('t1'), 'Старая версия', 'x'), 'task_conflict', 'устаревшая версия даёт конфликт');
select pg_temp.ok((select count(*) from public.task_events where task_id = pg_temp.id('t1')) >= 3, 'история действий пишется');

select pg_temp.login(pg_temp.id('x'));
select pg_temp.ok((select count(*) from public.tasks) = 0, 'другая компания не видит задачи');
select pg_temp.ok((select count(*) from public.task_comments) = 0, 'другая компания не видит комментарии');
select pg_temp.fails(format('select public.set_task_status(%L, ''done'')', pg_temp.id('t1')),
  'forbidden', 'другая компания не меняет статус');

-- Потеря доступа снимает назначение
select pg_temp.login(pg_temp.id('o'));
select public.update_page_scope(pg_temp.id('pTasks'),
  jsonb_build_array(jsonb_build_object('kind', 'unit', 'unit_id', pg_temp.id('alm'))));
select pg_temp.ok((select assignee_id is null from public.tasks where id = pg_temp.id('t1')),
  'после потери доступа задача остаётся без ответственного');
select pg_temp.ok((select count(*) from public.task_coassignees where task_id = pg_temp.id('t1')) = 0,
  'после потери доступа соисполнители снимаются');

select public.set_page_archived(pg_temp.id('pTasks'), true);
select pg_temp.fails(format('select public.create_task(%L, %L, %L, now() + interval ''1 day'')',
  pg_temp.id('pTasks'), 'В архив', 'x'), 'page_unavailable', 'в архивной странице задачи не создаются');

-- =================== ЧАТ ===================
select pg_temp.login(pg_temp.id('e1'));
insert into ids values ('msg1', public.send_message(pg_temp.id('pChat'), '11111111-1111-1111-1111-111111111111', 'Всем привет'));
select pg_temp.ok(public.send_message(pg_temp.id('pChat'), '11111111-1111-1111-1111-111111111111', 'Всем привет') = pg_temp.id('msg1'),
  'повторная отправка возвращает то же сообщение');
select pg_temp.ok((select count(*) from public.messages) = 1, 'дубль не создаётся');
select pg_temp.fails(format('select public.send_message(%L, gen_random_uuid(), %L)', pg_temp.id('pChat'), '   '),
  '23514', 'пустое сообщение не отправляется');
select pg_temp.fails(format('select public.send_message(%L, gen_random_uuid(), %L)', pg_temp.id('pTasks'), 'Сюда'),
  'page_unavailable', 'в страницу задач сообщение не отправить');

select pg_temp.login(pg_temp.id('e2'));
select pg_temp.ok((select unread_count from public.get_my_chats() where page_id = pg_temp.id('pChat')) = 1, 'непрочитанное считается');
select public.mark_chat_read(pg_temp.id('pChat'));
select pg_temp.ok((select unread_count from public.get_my_chats() where page_id = pg_temp.id('pChat')) = 0, 'после прочтения счётчик 0');
select public.send_message(pg_temp.id('pChat'), gen_random_uuid(), 'Ответ', pg_temp.id('msg1'));
select pg_temp.fails(format('select public.delete_message(%L)', pg_temp.id('msg1')), 'forbidden', 'сотрудник не удаляет чужое сообщение');

select pg_temp.login(pg_temp.id('e1'));
select pg_temp.ok((select unread_count from public.get_my_chats() where page_id = pg_temp.id('pChat')) = 1,
  'своё сообщение не считается непрочитанным, чужое — считается');

select pg_temp.login(pg_temp.id('x'));
select pg_temp.ok((select count(*) from public.messages) = 0, 'другая компания не видит сообщения');
select pg_temp.ok((select count(*) from public.get_my_chats()) = 0, 'другая компания не видит чаты');
select pg_temp.fails(format('select public.send_message(%L, gen_random_uuid(), %L)', pg_temp.id('pChat'), 'Взлом'),
  'page_unavailable', 'другая компания не пишет в чат');

select pg_temp.login(pg_temp.id('m'));
select public.delete_message(pg_temp.id('msg1'));
select pg_temp.ok((select deleted_at is not null and body is null from public.messages where id = pg_temp.id('msg1')),
  'Manager удаляет сообщение, текст стирается');

-- =================== ОТМЕТКИ ===================
select pg_temp.login(pg_temp.id('e1'));
select pg_temp.ok(public.check_attendance('check_in', 51.128, 71.430, 15) ->> 'result' = 'accepted', 'приход в филиале принят');
select pg_temp.ok(public.check_attendance('check_in', 51.128, 71.430, 15) ->> 'result' = 'already_checked_in', 'второй приход подряд отклонён');
select pg_temp.ok(public.check_attendance('check_out', 51.1298, 71.430, 15) ->> 'result' = 'out_of_range', 'уход в 200 м от филиала отклонён');
select pg_temp.ok(public.check_attendance('check_out', 51.128, 71.430, 300) ->> 'result' = 'low_accuracy', 'слишком низкая точность GPS отклонена');
select pg_temp.ok(public.check_attendance('check_out', 51.12820, 71.43040, 20) ->> 'result' = 'accepted', 'уход в радиусе 50 м принят');
select pg_temp.ok(public.check_attendance('check_out', 51.128, 71.430, 15) ->> 'result' = 'not_checked_in', 'уход без прихода отклонён');
select pg_temp.fails('select public.check_attendance(''check_in'', 999, 71.4, 10)', 'invalid_location', 'неверные координаты отклонены');
select pg_temp.fails('insert into public.attendance_events (organization_id, user_id, kind, result) values (gen_random_uuid(), auth.uid(), ''check_in'', ''accepted'')',
  '42501', 'подделать отметку напрямую нельзя');

select pg_temp.login(pg_temp.id('e2'));
select pg_temp.ok(public.check_attendance('check_in', 43.238, 76.889, 10) ->> 'result' = 'no_point', 'у филиала без точки отметка отклоняется');
select pg_temp.ok((select count(*) from public.attendance_events where user_id = pg_temp.id('e1')) = 0, 'сотрудник не видит чужие отметки');

select pg_temp.login(pg_temp.id('m'));
select pg_temp.ok((select count(*) from public.attendance_events where user_id = pg_temp.id('e1')) = 6, 'Manager видит отметки своего филиала');
select pg_temp.ok((select count(*) from public.attendance_events where user_id = pg_temp.id('e2')) = 0, 'Manager не видит отметки чужого филиала');

select pg_temp.login(pg_temp.id('o'));
select pg_temp.ok((select count(*) from public.attendance_events) = 7, 'Owner видит все отметки компании');

select pg_temp.login(pg_temp.id('x'));
select pg_temp.ok((select count(*) from public.attendance_events) = 0, 'другая компания не видит отметки');

-- =================== ПОИСК ===================
select pg_temp.login(pg_temp.id('x'));
select pg_temp.ok((select count(*) from public.search_people('арм')) = 1, 'поиск людей по части имени');
select pg_temp.ok((select organization_name from public.search_people('Сеитов')) = 'Магазин мужской одежды', 'в выдаче видно место работы');
select pg_temp.ok((select count(*) from public.search_organizations('мужской')) = 1, 'поиск компаний по части названия');
select pg_temp.ok((select members_count from public.search_organizations('menswear')) = 4, 'в выдаче компаний число сотрудников');
select pg_temp.ok((select count(*) from public.search_people('%')) = 0, 'символ % ищется буквально');
select pg_temp.ok((select count(*) from public.search_people('')) = 6, 'пустой запрос показывает каталог');

-- =================== ХРАНИЛИЩЕ ===================
select pg_temp.login(pg_temp.id('e1'));
insert into storage.objects (bucket_id, name) values ('avatars', pg_temp.id('e1')::text || '/avatar.png');
select pg_temp.ok(true, 'свой аватар загружается');
select pg_temp.fails(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'avatars', pg_temp.id('e2')::text || '/avatar.png'),
  '42501', 'чужой аватар не загрузить');
select pg_temp.fails(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'logos', pg_temp.id('org')::text || '/logo.png'),
  '42501', 'сотрудник не меняет логотип компании');
select pg_temp.login(pg_temp.id('o'));
insert into storage.objects (bucket_id, name) values ('logos', pg_temp.id('org')::text || '/logo.png');
select pg_temp.ok(true, 'Owner загружает логотип');
select pg_temp.login(pg_temp.id('x'));
select pg_temp.fails(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'logos', pg_temp.id('org')::text || '/logo2.png'),
  '42501', 'другая компания не меняет логотип');

select pg_temp.logout();
\echo '===== ВСЕ ТЕСТЫ МОДУЛЕЙ ПРОЙДЕНЫ ====='
rollback;
