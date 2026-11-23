-- =====================================================================
-- Tandem · миграция 5 · модуль «Задачи»
-- Задача принадлежит одной рабочей странице модуля tasks.
-- Видят все, у кого есть доступ к странице. Все изменения — через RPC.
-- Новые коды ошибок: page_unavailable, task_conflict, due_in_past,
--   self_assign_forbidden, assignee_no_access, not_found
-- =====================================================================

create type public.task_status as enum ('todo', 'in_progress', 'done');
create type public.task_priority as enum ('low', 'normal', 'high', 'urgent');

create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  page_id         uuid not null,
  parent_task_id  uuid references public.tasks (id) on delete cascade, -- зарезервировано под подзадачи
  title           text not null check (char_length(btrim(title)) between 1 and 200),
  description     text not null check (char_length(btrim(description)) between 1 and 5000),
  status          public.task_status not null default 'todo',
  priority        public.task_priority not null default 'normal',
  assignee_id     uuid,
  due_at          timestamptz not null,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz,
  archived_at     timestamptz,
  version         integer not null default 1,
  unique (organization_id, id),
  foreign key (organization_id, page_id)
    references public.pages (organization_id, id) on delete cascade,
  foreign key (organization_id, assignee_id)
    references public.memberships (organization_id, user_id) on delete set null (assignee_id)
);
create index tasks_page_idx on public.tasks (page_id, status) where archived_at is null;
create index tasks_assignee_idx on public.tasks (assignee_id) where archived_at is null;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create table public.task_coassignees (
  organization_id uuid not null,
  task_id         uuid not null,
  user_id         uuid not null,
  primary key (task_id, user_id),
  foreign key (organization_id, task_id)
    references public.tasks (organization_id, id) on delete cascade,
  foreign key (organization_id, user_id)
    references public.memberships (organization_id, user_id) on delete cascade
);
create index task_coassignees_user_idx on public.task_coassignees (user_id);

create table public.task_comments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  task_id         uuid not null,
  author_id       uuid references public.profiles (id) on delete set null,
  body            text check (char_length(body) <= 2000),
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz,
  foreign key (organization_id, task_id)
    references public.tasks (organization_id, id) on delete cascade,
  check (deleted_at is not null or char_length(btrim(body)) >= 1)
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);

-- Короткая история действий по задаче.
create table public.task_events (
  id              bigint generated always as identity primary key,
  organization_id uuid not null,
  task_id         uuid not null,
  actor_id        uuid references public.profiles (id) on delete set null,
  kind            text not null,
  details         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  foreign key (organization_id, task_id)
    references public.tasks (organization_id, id) on delete cascade
);
create index task_events_task_idx on public.task_events (task_id, created_at);

-- ---------- Проверки ----------
-- Страница доступна для записи: модуль tasks, активна, подписка активна, у пользователя есть доступ.
create or replace function public.task_page_writable(p_page uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pages p
    where p.id = p_page and p.module_key = 'tasks' and p.status = 'active'
      and public.org_is_active(p.organization_id)
      and public.can_access_page(p.id)
  );
$$;

-- Менять поля и назначения: автор, Owner, Admin, Manager с доступом к странице.
create or replace function public.can_edit_task(p_task uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = p_task
      and public.can_access_page(t.page_id)
      and (t.created_by = (select auth.uid())
           or public.has_role(t.organization_id, 'owner', 'admin', 'manager'))
  );
$$;

-- Менять статус и комментировать: всё выше плюс ответственный и соисполнители.
create or replace function public.can_work_task(p_task uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.can_edit_task(p_task) or exists (
    select 1 from public.tasks t
    where t.id = p_task
      and public.can_access_page(t.page_id)
      and (t.assignee_id = (select auth.uid())
           or exists (select 1 from public.task_coassignees c
                      where c.task_id = t.id and c.user_id = (select auth.uid())))
  );
$$;

create or replace function public.log_task_event(p_task uuid, p_kind text, p_details jsonb default '{}'::jsonb)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.task_events (organization_id, task_id, actor_id, kind, details)
  select t.organization_id, t.id, (select auth.uid()), p_kind, coalesce(p_details, '{}'::jsonb)
  from public.tasks t where t.id = p_task;
$$;

-- Назначенные люди должны иметь доступ к странице.
create or replace function public.check_task_people(p_page uuid, p_assignee uuid, p_co uuid[])
returns void
language plpgsql stable security definer
set search_path = ''
as $$
declare v_u uuid;
begin
  for v_u in select unnest(array_remove(coalesce(p_co, '{}'::uuid[]) || p_assignee, null)) loop
    if not exists (select 1 from public.page_access a where a.page_id = p_page and a.user_id = v_u) then
      raise exception 'assignee_no_access' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

-- ---------- RPC ----------
create or replace function public.create_task(
  p_page uuid, p_title text, p_description text, p_due_at timestamptz,
  p_priority public.task_priority default 'normal',
  p_assignee uuid default null, p_coassignees uuid[] default '{}'
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.require_uid();
  v_org  uuid;
  v_task uuid;
begin
  if not public.task_page_writable(p_page) then
    raise exception 'page_unavailable' using errcode = 'P0001';
  end if;
  if p_due_at is null or p_due_at <= now() then
    raise exception 'due_in_past' using errcode = 'P0001';
  end if;
  -- По ТЗ (раздел 12): при создании автор не выбирает себя ответственным. См. открытые вопросы.
  if p_assignee = v_uid then
    raise exception 'self_assign_forbidden' using errcode = 'P0001';
  end if;
  perform public.check_task_people(p_page, p_assignee, p_coassignees);

  select organization_id into v_org from public.pages where id = p_page;
  insert into public.tasks (organization_id, page_id, title, description, priority, assignee_id, due_at, created_by)
  values (v_org, p_page, btrim(p_title), btrim(p_description), coalesce(p_priority, 'normal'), p_assignee, p_due_at, v_uid)
  returning id into v_task;

  insert into public.task_coassignees (organization_id, task_id, user_id)
  select v_org, v_task, u from unnest(coalesce(p_coassignees, '{}'::uuid[])) u
  where u is distinct from p_assignee
  on conflict do nothing;

  perform public.log_task_event(v_task, 'created');
  return v_task;
end;
$$;

create or replace function public.update_task(
  p_task uuid, p_expected_version integer,
  p_title text, p_description text, p_due_at timestamptz, p_priority public.task_priority
)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_t public.tasks%rowtype;
begin
  perform public.require_uid();
  select * into v_t from public.tasks where id = p_task for update;
  if v_t.id is null or not public.can_edit_task(p_task) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_t.archived_at is not null or not public.task_page_writable(v_t.page_id) then
    raise exception 'page_unavailable' using errcode = 'P0001';
  end if;
  if v_t.version <> p_expected_version then
    raise exception 'task_conflict' using errcode = 'P0001';
  end if;
  if p_due_at is distinct from v_t.due_at and p_due_at <= now() then
    raise exception 'due_in_past' using errcode = 'P0001';
  end if;
  update public.tasks
  set title = btrim(p_title), description = btrim(p_description),
      due_at = p_due_at, priority = p_priority, version = version + 1
  where id = p_task;
  perform public.log_task_event(p_task, 'updated', jsonb_build_object(
    'due_changed', p_due_at is distinct from v_t.due_at,
    'from_due', v_t.due_at, 'to_due', p_due_at));
  return v_t.version + 1;
end;
$$;

create or replace function public.set_task_assignees(
  p_task uuid, p_expected_version integer, p_assignee uuid, p_coassignees uuid[] default '{}'
)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_t public.tasks%rowtype;
begin
  perform public.require_uid();
  select * into v_t from public.tasks where id = p_task for update;
  if v_t.id is null or not public.can_edit_task(p_task) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_t.archived_at is not null or not public.task_page_writable(v_t.page_id) then
    raise exception 'page_unavailable' using errcode = 'P0001';
  end if;
  if v_t.version <> p_expected_version then
    raise exception 'task_conflict' using errcode = 'P0001';
  end if;
  perform public.check_task_people(v_t.page_id, p_assignee, p_coassignees);

  update public.tasks set assignee_id = p_assignee, version = version + 1 where id = p_task;
  delete from public.task_coassignees where task_id = p_task;
  insert into public.task_coassignees (organization_id, task_id, user_id)
  select v_t.organization_id, p_task, u from unnest(coalesce(p_coassignees, '{}'::uuid[])) u
  where u is distinct from p_assignee
  on conflict do nothing;

  perform public.log_task_event(p_task, 'assignees_changed',
    jsonb_build_object('from', v_t.assignee_id, 'to', p_assignee));
  return v_t.version + 1;
end;
$$;

-- Статус меняется без проверки версии: перетаскивание по доске, побеждает последнее действие.
create or replace function public.set_task_status(p_task uuid, p_status public.task_status)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_t public.tasks%rowtype;
begin
  perform public.require_uid();
  select * into v_t from public.tasks where id = p_task for update;
  if v_t.id is null or not public.can_work_task(p_task) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_t.archived_at is not null or not public.task_page_writable(v_t.page_id) then
    raise exception 'page_unavailable' using errcode = 'P0001';
  end if;
  if v_t.status = p_status then
    return v_t.version;
  end if;
  update public.tasks
  set status = p_status,
      completed_at = case when p_status = 'done' then now() else null end,
      version = version + 1
  where id = p_task;
  perform public.log_task_event(p_task, 'status_changed', jsonb_build_object('from', v_t.status, 'to', p_status));
  return v_t.version + 1;
end;
$$;

create or replace function public.set_task_archived(p_task uuid, p_archived boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_t public.tasks%rowtype;
begin
  perform public.require_uid();
  select * into v_t from public.tasks where id = p_task for update;
  if v_t.id is null or not public.can_edit_task(p_task) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.task_page_writable(v_t.page_id) then
    raise exception 'page_unavailable' using errcode = 'P0001';
  end if;
  update public.tasks
  set archived_at = case when p_archived then now() else null end, version = version + 1
  where id = p_task;
  perform public.log_task_event(p_task, case when p_archived then 'archived' else 'restored' end);
end;
$$;

create or replace function public.add_task_comment(p_task uuid, p_body text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_t  public.tasks%rowtype;
  v_id uuid;
begin
  perform public.require_uid();
  select * into v_t from public.tasks where id = p_task;
  if v_t.id is null or not public.can_work_task(p_task) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.task_page_writable(v_t.page_id) then
    raise exception 'page_unavailable' using errcode = 'P0001';
  end if;
  insert into public.task_comments (organization_id, task_id, author_id, body)
  values (v_t.organization_id, p_task, (select auth.uid()), btrim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.edit_task_comment(p_comment uuid, p_body text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_c public.task_comments%rowtype;
begin
  perform public.require_uid();
  select * into v_c from public.task_comments where id = p_comment;
  if v_c.id is null or v_c.deleted_at is not null or v_c.author_id <> (select auth.uid()) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.task_page_writable((select page_id from public.tasks where id = v_c.task_id)) then
    raise exception 'page_unavailable' using errcode = 'P0001';
  end if;
  update public.task_comments set body = btrim(p_body), edited_at = now() where id = p_comment;
end;
$$;

create or replace function public.delete_task_comment(p_comment uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_c public.task_comments%rowtype;
begin
  perform public.require_uid();
  select * into v_c from public.task_comments where id = p_comment;
  if v_c.id is null or v_c.deleted_at is not null or v_c.author_id <> (select auth.uid()) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update public.task_comments set body = null, deleted_at = now() where id = p_comment;
end;
$$;

-- ---------- Потеря доступа снимает назначения ----------
-- Расширяем пересчёт доступа: если ответственный больше не видит страницу,
-- задача остаётся без ответственного (фильтр «Требуют переназначения»).
create or replace function public.recompute_page_access(p_org uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));

  delete from public.page_access where organization_id = p_org;

  insert into public.page_access (organization_id, page_id, user_id)
  with recursive tree as (
    select u.id as root_id, u.id as unit_id
    from public.units u
    where u.organization_id = p_org
    union all
    select t.root_id, c.id
    from tree t
    join public.units c on c.parent_id = t.unit_id
  ),
  grants as (
    select p.id as page_id, m.user_id
    from public.pages p
    join public.memberships m
      on m.organization_id = p.organization_id and m.role in ('owner', 'admin')
    where p.organization_id = p_org
    union
    select s.page_id, m.user_id
    from public.page_scopes s
    join public.memberships m on m.organization_id = s.organization_id
    where s.organization_id = p_org and s.kind = 'organization'
    union
    select s.page_id, s.user_id
    from public.page_scopes s
    where s.organization_id = p_org and s.kind = 'user'
    union
    select s.page_id, um.user_id
    from public.page_scopes s
    join tree t on t.root_id = s.unit_id
    join public.unit_members um on um.unit_id = t.unit_id
    where s.organization_id = p_org and s.kind = 'unit'
  )
  select p_org, g.page_id, g.user_id from grants g;

  update public.tasks t
  set assignee_id = null, version = t.version + 1
  where t.organization_id = p_org and t.assignee_id is not null
    and not exists (select 1 from public.page_access a
                    where a.page_id = t.page_id and a.user_id = t.assignee_id);

  delete from public.task_coassignees c
  using public.tasks t
  where c.task_id = t.id and t.organization_id = p_org
    and not exists (select 1 from public.page_access a
                    where a.page_id = t.page_id and a.user_id = c.user_id);
end;
$$;
revoke execute on function public.recompute_page_access(uuid) from public, anon, authenticated;

-- ---------- RLS ----------
alter table public.tasks            enable row level security;
alter table public.task_coassignees enable row level security;
alter table public.task_comments    enable row level security;
alter table public.task_events      enable row level security;

create policy tasks_select on public.tasks
  for select to authenticated using (public.can_access_page(page_id));
create policy task_coassignees_select on public.task_coassignees
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.can_access_page(t.page_id)));
create policy task_comments_select on public.task_comments
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.can_access_page(t.page_id)));
create policy task_events_select on public.task_events
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.can_access_page(t.page_id)));

-- ---------- Права на выполнение ----------
revoke execute on function public.task_page_writable(uuid) from public, anon, authenticated;
revoke execute on function public.log_task_event(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.check_task_people(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.can_edit_task(uuid) from public, anon;
revoke execute on function public.can_work_task(uuid) from public, anon;
grant  execute on function public.can_edit_task(uuid) to authenticated;
grant  execute on function public.can_work_task(uuid) to authenticated;

revoke execute on function public.create_task(uuid, text, text, timestamptz, public.task_priority, uuid, uuid[]) from public, anon;
revoke execute on function public.update_task(uuid, integer, text, text, timestamptz, public.task_priority) from public, anon;
revoke execute on function public.set_task_assignees(uuid, integer, uuid, uuid[]) from public, anon;
revoke execute on function public.set_task_status(uuid, public.task_status) from public, anon;
revoke execute on function public.set_task_archived(uuid, boolean) from public, anon;
revoke execute on function public.add_task_comment(uuid, text) from public, anon;
revoke execute on function public.edit_task_comment(uuid, text) from public, anon;
revoke execute on function public.delete_task_comment(uuid) from public, anon;
grant execute on function public.create_task(uuid, text, text, timestamptz, public.task_priority, uuid, uuid[]) to authenticated;
grant execute on function public.update_task(uuid, integer, text, text, timestamptz, public.task_priority) to authenticated;
grant execute on function public.set_task_assignees(uuid, integer, uuid, uuid[]) to authenticated;
grant execute on function public.set_task_status(uuid, public.task_status) to authenticated;
grant execute on function public.set_task_archived(uuid, boolean) to authenticated;
grant execute on function public.add_task_comment(uuid, text) to authenticated;
grant execute on function public.edit_task_comment(uuid, text) to authenticated;
grant execute on function public.delete_task_comment(uuid) to authenticated;
