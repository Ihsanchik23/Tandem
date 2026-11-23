-- =====================================================================
-- Tandem · миграция 2 · функции доступа и пересчёт page_access
-- =====================================================================

-- ---------- Функции-проверки (используются в RLS) ----------
create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins where user_id = (select auth.uid())
  );
$$;

create or replace function public.my_role(p_org uuid)
returns public.member_role
language sql stable security definer
set search_path = ''
as $$
  select m.role from public.memberships m
  where m.organization_id = p_org and m.user_id = (select auth.uid());
$$;

create or replace function public.is_member(p_org uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_role(p_org uuid, variadic p_roles public.member_role[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(public.my_role(p_org) = any (p_roles), false);
$$;

create or replace function public.org_is_active(p_org uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.organization_id = p_org and s.status = 'active' and s.paid_until > now()
  );
$$;

create or replace function public.can_access_page(p_page uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.page_access a
    where a.page_id = p_page and a.user_id = (select auth.uid())
  );
$$;

-- ---------- Пересчёт доступа к страницам компании ----------
-- Правила: Owner и Admin видят всё; Scope «вся компания» — все сотрудники;
-- Scope «подразделение» — сотрудники подразделения и всех дочерних;
-- Scope «человек» — этот человек.
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
end;
$$;

create or replace function public.trg_recompute_page_access()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_page_access(old.organization_id);
  else
    perform public.recompute_page_access(new.organization_id);
    if tg_op = 'UPDATE' and old.organization_id is distinct from new.organization_id then
      perform public.recompute_page_access(old.organization_id);
    end if;
  end if;
  return null;
end;
$$;

create trigger memberships_recompute_access
  after insert or update or delete on public.memberships
  for each row execute function public.trg_recompute_page_access();
create trigger units_recompute_access
  after insert or update of parent_id or delete on public.units
  for each row execute function public.trg_recompute_page_access();
create trigger unit_members_recompute_access
  after insert or update or delete on public.unit_members
  for each row execute function public.trg_recompute_page_access();
create trigger page_scopes_recompute_access
  after insert or update or delete on public.page_scopes
  for each row execute function public.trg_recompute_page_access();
create trigger pages_recompute_access
  after insert or delete on public.pages
  for each row execute function public.trg_recompute_page_access();

-- ---------- Защита дерева подразделений ----------
create or replace function public.units_guard()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_cur   uuid := new.parent_id;
  v_depth integer := 0;
begin
  if tg_op = 'UPDATE' and new.organization_id <> old.organization_id then
    raise exception 'organization_change_forbidden' using errcode = 'P0001';
  end if;
  while v_cur is not null loop
    if v_cur = new.id then
      raise exception 'unit_cycle' using errcode = 'P0001';
    end if;
    select u.parent_id into v_cur from public.units u where u.id = v_cur;
    v_depth := v_depth + 1;
    if v_depth > 50 then
      raise exception 'unit_too_deep' using errcode = 'P0001';
    end if;
  end loop;
  return new;
end;
$$;
create trigger units_guard before insert or update on public.units
  for each row execute function public.units_guard();

create or replace function public.prevent_org_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id <> old.organization_id then
    raise exception 'organization_change_forbidden' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger unit_members_guard before update on public.unit_members
  for each row execute function public.prevent_org_change();
create trigger organization_founders_guard before update on public.organization_founders
  for each row execute function public.prevent_org_change();

-- ---------- Журнал ----------
create or replace function public.write_audit(
  p_org uuid, p_action text, p_target_type text default null,
  p_target_id uuid default null, p_details jsonb default '{}'::jsonb
)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.audit_log (organization_id, actor_id, action, target_type, target_id, details)
  values (p_org, (select auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------- Права на выполнение ----------
-- Внутренние функции клиентам недоступны.
revoke execute on function public.recompute_page_access(uuid) from public, anon, authenticated;
revoke execute on function public.trg_recompute_page_access() from public, anon, authenticated;
revoke execute on function public.units_guard() from public, anon, authenticated;
revoke execute on function public.prevent_org_change() from public, anon, authenticated;
revoke execute on function public.write_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Проверки, которые нужны RLS, доступны только вошедшим пользователям.
revoke execute on function public.is_platform_admin() from public, anon;
revoke execute on function public.my_role(uuid) from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.has_role(uuid, public.member_role[]) from public, anon;
revoke execute on function public.org_is_active(uuid) from public, anon;
revoke execute on function public.can_access_page(uuid) from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.my_role(uuid) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.member_role[]) to authenticated;
grant execute on function public.org_is_active(uuid) to authenticated;
grant execute on function public.can_access_page(uuid) to authenticated;
