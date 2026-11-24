-- Tandem · тесты ограничения частоты. Всё в транзакции, в конце откат.
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

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000aa01'), ('00000000-0000-0000-0000-00000000aa02'),
  ('00000000-0000-0000-0000-00000000aa09');
insert into public.platform_admins values ('00000000-0000-0000-0000-00000000aa09');

select pg_temp.login('00000000-0000-0000-0000-00000000aa09');
select public.admin_activate_subscription('00000000-0000-0000-0000-00000000aa01', now() + interval '30 days');

select pg_temp.login('00000000-0000-0000-0000-00000000aa01');
insert into ids values ('org', public.create_organization('Лимит', 'limit-co'));
insert into ids values ('chat', public.create_page((select v from ids where k='org'), 'chat', 'Чат', '[{"kind":"organization"}]'));
insert into ids values ('tasks', public.create_page((select v from ids where k='org'), 'tasks', 'Задачи', '[{"kind":"organization"}]'));

do $$
declare i int;
begin
  for i in 1..30 loop
    perform public.send_message((select v from ids where k='chat'), gen_random_uuid(), 'сообщение ' || i);
  end loop;
end $$;
select pg_temp.ok(true, '30 сообщений за минуту проходят');
select pg_temp.fails(format('select public.send_message(%L, gen_random_uuid(), %L)', (select v from ids where k='chat'), 'лишнее'),
  'rate_limited', '31-е сообщение за минуту отклонено');

do $$
declare i int;
begin
  for i in 1..60 loop
    perform public.create_task((select v from ids where k='tasks'), 'Задача ' || i, 'текст', now() + interval '1 day');
  end loop;
end $$;
select pg_temp.ok(true, '60 задач за час проходят');
select pg_temp.fails(format('select public.create_task(%L, %L, %L, now() + interval ''1 day'')', (select v from ids where k='tasks'), 'лишняя', 'x'),
  'rate_limited', '61-я задача за час отклонена');

insert into ids values ('t', (select id from public.tasks limit 1));
do $$
declare i int;
begin
  for i in 1..30 loop
    perform public.add_task_comment((select v from ids where k='t'), 'комментарий ' || i);
  end loop;
end $$;
select pg_temp.fails(format('select public.add_task_comment(%L, %L)', (select v from ids where k='t'), 'лишний'),
  'rate_limited', '31-й комментарий за минуту отклонён');

select pg_temp.ok(
  (select count(*) from public.messages where author_id = '00000000-0000-0000-0000-00000000aa01') = 30,
  'лишние сообщения не сохранились');

reset role;
\echo '===== ТЕСТЫ ЛИМИТОВ ПРОЙДЕНЫ ====='
rollback;
