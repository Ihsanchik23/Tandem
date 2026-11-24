-- Tandem · тесты canvas_prefs (личная расстановка на «Структуре»). Всё в транзакции, в конце откат.
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

-- Владелец A (dd001), сотрудник A (dd002), владелец B (dd009).
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000dd001'), ('00000000-0000-0000-0000-0000000dd002'),
  ('00000000-0000-0000-0000-0000000dd009');
insert into public.subscriptions (owner_user_id, paid_until, seats) values
  ('00000000-0000-0000-0000-0000000dd001', now() + interval '30 days', 15),
  ('00000000-0000-0000-0000-0000000dd009', now() + interval '30 days', 15);
select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
insert into ids values ('A', public.create_organization('Холст А', 'canvas-a'));
select pg_temp.login('00000000-0000-0000-0000-0000000dd009');
insert into ids values ('B', public.create_organization('Холст Б', 'canvas-b'));
reset role;
insert into public.memberships (organization_id, user_id, role) values
  ((select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd002', 'employee');

-- Каждый сохраняет свою расстановку.
select pg_temp.login('00000000-0000-0000-0000-0000000dd001');
select public.save_canvas_positions((select v from ids where k='A'), '{"root":[0,0],"u1":[300,200]}');
select pg_temp.login('00000000-0000-0000-0000-0000000dd002');
select public.save_canvas_positions((select v from ids where k='A'), '{"root":[50,50]}');
select pg_temp.ok((select positions = '{"root":[50,50]}' from public.canvas_prefs), 'сотрудник видит только свою расстановку');
select pg_temp.ok((select count(*) = 1 from public.canvas_prefs), 'чужую строку коллеги не видно');

-- Повторное сохранение заменяет, '{}' — «вернуть на места».
select public.save_canvas_positions((select v from ids where k='A'), '{"root":[10,20]}');
select pg_temp.ok((select positions = '{"root":[10,20]}' from public.canvas_prefs), 'сохранение заменяет прежнюю');
select public.save_canvas_positions((select v from ids where k='A'), '{}');
select pg_temp.ok((select positions = '{}' from public.canvas_prefs), '«вернуть на места» очищает');

-- Прямые изменения закрыты.
select pg_temp.fails(format($q$insert into public.canvas_prefs (organization_id, user_id) values (%L, %L)$q$,
  (select v from ids where k='A'), '00000000-0000-0000-0000-0000000dd002'), 'permission denied', 'прямая запись запрещена');
select pg_temp.fails($q$update public.canvas_prefs set positions = '{}'$q$, 'permission denied', 'прямое изменение запрещено');

-- Неверные данные отклоняются.
select pg_temp.fails(format($q$select public.save_canvas_positions(%L, '[1,2]')$q$, (select v from ids where k='A')), 'invalid_positions', 'не объект — отказ');
select pg_temp.fails(format($q$select public.save_canvas_positions(%L, '{"u":[1]}')$q$, (select v from ids where k='A')), 'invalid_positions', 'не пара чисел — отказ');
select pg_temp.fails(format($q$select public.save_canvas_positions(%L, '{"u":["a",1]}')$q$, (select v from ids where k='A')), 'invalid_positions', 'не число — отказ');
select pg_temp.fails(format($q$select public.save_canvas_positions(%L, '{"u":[1e9,1]}')$q$, (select v from ids where k='A')), 'invalid_positions', 'за пределами холста — отказ');

-- Чужая компания: ни записать, ни прочитать.
select pg_temp.login('00000000-0000-0000-0000-0000000dd009');
select pg_temp.fails(format($q$select public.save_canvas_positions(%L, '{}')$q$, (select v from ids where k='A')), 'forbidden', 'владелец чужой компании не может сохранить в компанию A');
select pg_temp.ok((select count(*) = 0 from public.canvas_prefs where organization_id = (select v from ids where k='A')), 'владелец чужой компании не видит расстановки компании A');

-- Без входа — нельзя.
reset role;
set local role anon;
select pg_temp.fails(format($q$select public.save_canvas_positions(%L, '{}')$q$, (select v from ids where k='A')), 'permission denied', 'anon не может сохранить');
select pg_temp.fails('select * from public.canvas_prefs', 'permission denied', 'anon не может читать');

-- Вышел из компании — расстановка удалена.
select pg_temp.login('00000000-0000-0000-0000-0000000dd002');
select public.leave_organization();
reset role;
select pg_temp.ok((select count(*) = 0 from public.canvas_prefs where user_id = '00000000-0000-0000-0000-0000000dd002'), 'после выхода из компании расстановка удалена');
select pg_temp.ok((select count(*) = 1 from public.canvas_prefs where user_id = '00000000-0000-0000-0000-0000000dd001'), 'расстановка владельца на месте');

reset role;
rollback;
