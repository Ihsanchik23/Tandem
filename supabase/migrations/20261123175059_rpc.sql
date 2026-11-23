-- =====================================================================
-- Tandem · миграция 4 · серверные функции (RPC)
-- Одни и те же функции вызывает веб, а позже мобильное и десктоп-приложение.
-- Ошибки возвращаются кодами (message), интерфейс переводит их в понятный текст:
--   not_authenticated, forbidden, subscription_required, subscription_inactive,
--   already_member, already_member_here, not_member, owner_cannot_leave,
--   invite_invalid, no_free_seats, module_unavailable, scope_required,
--   scope_invalid, not_found, invalid_role
-- =====================================================================

create or replace function public.require_uid()
returns uuid
language plpgsql stable
set search_path = ''
as $$
declare v uuid := (select auth.uid());
begin
  if v is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  return v;
end;
$$;

-- ---------- Суперадмин: активация подписки Team вручную (пилот) ----------
create or replace function public.admin_activate_subscription(
  p_user uuid, p_paid_until timestamptz, p_seats integer default 15
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  perform public.require_uid();
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select id into v_id from public.subscriptions
  where owner_user_id = p_user
  order by created_at desc limit 1;

  if v_id is null then
    insert into public.subscriptions (owner_user_id, status, seats, paid_until)
    values (p_user, 'active', greatest(p_seats, 15), p_paid_until)
    returning id into v_id;
  else
    update public.subscriptions
    set status = 'active', seats = greatest(p_seats, 15), paid_until = p_paid_until
    where id = v_id;
  end if;
  return v_id;
end;
$$;

-- ---------- Создание компании ----------
create or replace function public.create_organization(
  p_name text, p_slug text,
  p_description text default null, p_city text default null, p_logo_url text default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_uid();
  v_sub uuid;
  v_org uuid;
begin
  if exists (select 1 from public.memberships where user_id = v_uid) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  select id into v_sub from public.subscriptions
  where owner_user_id = v_uid and organization_id is null
    and status = 'active' and paid_until > now()
  order by paid_until desc limit 1
  for update;
  if v_sub is null then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  insert into public.organizations (slug, name, description, city, logo_url, created_by)
  values (lower(btrim(p_slug)), btrim(p_name), p_description, p_city, p_logo_url, v_uid)
  returning id into v_org;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org, v_uid, 'owner');
  insert into public.organization_founders (organization_id, user_id) values (v_org, v_uid);
  update public.subscriptions set organization_id = v_org where id = v_sub;
  insert into public.organization_modules (organization_id, module_key)
  select v_org, key from public.modules;

  perform public.write_audit(v_org, 'organization.created', 'organization', v_org);
  return v_org;
end;
$$;

-- ---------- Приглашения ----------
create or replace function public.create_invite(p_org uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_uid();
  v_token text;
  v_id uuid;
begin
  if not public.has_role(p_org, 'owner', 'admin') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.org_is_active(p_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  insert into public.invites (organization_id, created_by)
  values (p_org, v_uid)
  returning id, token into v_id, v_token;
  perform public.write_audit(p_org, 'invite.created', 'invite', v_id);
  return v_token;
end;
$$;

create or replace function public.revoke_invite(p_invite uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_org uuid;
begin
  perform public.require_uid();
  select organization_id into v_org from public.invites where id = p_invite;
  if v_org is null or not public.has_role(v_org, 'owner', 'admin') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update public.invites set revoked_at = now() where id = p_invite and revoked_at is null;
  perform public.write_audit(v_org, 'invite.revoked', 'invite', p_invite);
end;
$$;

-- Предпросмотр по ссылке: доступен и без входа (экран «Присоединиться»).
create or replace function public.get_invite_preview(p_token text)
returns table (organization_id uuid, name text, slug text, logo_url text, is_valid boolean)
language sql stable security definer
set search_path = ''
as $$
  select o.id, o.name, o.slug, o.logo_url,
         (i.revoked_at is null and i.expires_at > now() and public.org_is_active(o.id)) as is_valid
  from public.invites i
  join public.organizations o on o.id = i.organization_id
  where i.token = p_token;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public.require_uid();
  v_inv   public.invites%rowtype;
  v_seats integer;
  v_used  integer;
  v_cur   uuid;
begin
  select * into v_inv from public.invites where token = p_token;
  if v_inv.id is null or v_inv.revoked_at is not null or v_inv.expires_at <= now() then
    raise exception 'invite_invalid' using errcode = 'P0001';
  end if;

  -- Блокируем компанию, чтобы два человека не заняли последнее место одновременно.
  perform 1 from public.organizations where id = v_inv.organization_id for update;

  select organization_id into v_cur from public.memberships where user_id = v_uid;
  if v_cur = v_inv.organization_id then
    raise exception 'already_member_here' using errcode = 'P0001';
  elsif v_cur is not null then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  select seats into v_seats from public.subscriptions
  where organization_id = v_inv.organization_id and status = 'active' and paid_until > now();
  if v_seats is null then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  select count(*) into v_used from public.memberships where organization_id = v_inv.organization_id;
  if v_used >= v_seats then
    raise exception 'no_free_seats' using errcode = 'P0001';
  end if;

  insert into public.memberships (organization_id, user_id, role)
  values (v_inv.organization_id, v_uid, 'employee');
  perform public.write_audit(v_inv.organization_id, 'member.joined', 'user', v_uid,
                             jsonb_build_object('invite_id', v_inv.id));
  return v_inv.organization_id;
end;
$$;

-- ---------- Сотрудники ----------
create or replace function public.leave_organization()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_uid();
  v_m   public.memberships%rowtype;
begin
  select * into v_m from public.memberships where user_id = v_uid;
  if v_m.user_id is null then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  if v_m.role = 'owner' then
    raise exception 'owner_cannot_leave' using errcode = 'P0001';
  end if;
  -- Подразделения, Scope и руководство очищаются каскадом; доступ пересчитывается триггером.
  delete from public.memberships where organization_id = v_m.organization_id and user_id = v_uid;
  perform public.write_audit(v_m.organization_id, 'member.left', 'user', v_uid);
end;
$$;

create or replace function public.remove_member(p_org uuid, p_user uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid    uuid := public.require_uid();
  v_my     public.member_role := public.my_role(p_org);
  v_target public.member_role;
begin
  if v_my is null or v_my not in ('owner', 'admin') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_user = v_uid then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select role into v_target from public.memberships where organization_id = p_org and user_id = p_user;
  if v_target is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_target = 'owner' or (v_target = 'admin' and v_my <> 'owner') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  delete from public.memberships where organization_id = p_org and user_id = p_user;
  perform public.write_audit(p_org, 'member.removed', 'user', p_user, jsonb_build_object('role', v_target));
end;
$$;

create or replace function public.set_member_role(p_org uuid, p_user uuid, p_role public.member_role)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid    uuid := public.require_uid();
  v_my     public.member_role := public.my_role(p_org);
  v_target public.member_role;
begin
  if p_role = 'owner' then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;
  if v_my is null or v_my not in ('owner', 'admin') or p_user = v_uid then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.org_is_active(p_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  select role into v_target from public.memberships where organization_id = p_org and user_id = p_user;
  if v_target is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_target = 'owner' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  -- Назначать и снимать Admin может только Owner.
  if (p_role = 'admin' or v_target = 'admin') and v_my <> 'owner' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update public.memberships set role = p_role where organization_id = p_org and user_id = p_user;
  perform public.write_audit(p_org, 'member.role_changed', 'user', p_user,
                             jsonb_build_object('from', v_target, 'to', p_role));
end;
$$;

create or replace function public.set_member_position(p_org uuid, p_user uuid, p_position text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_old text;
begin
  perform public.require_uid();
  if not public.has_role(p_org, 'owner', 'admin') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.org_is_active(p_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  select position into v_old from public.memberships where organization_id = p_org and user_id = p_user;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  update public.memberships set position = nullif(btrim(p_position), '')
  where organization_id = p_org and user_id = p_user;
  perform public.write_audit(p_org, 'member.position_changed', 'user', p_user,
                             jsonb_build_object('from', v_old, 'to', p_position));
end;
$$;

-- ---------- Рабочие страницы и Scope ----------
-- Подразделения, где Manager может создавать страницы: те, где он состоит, и их дочерние.
create or replace function public.manager_unit_ids(p_org uuid, p_user uuid)
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  with recursive tree as (
    select um.unit_id as id from public.unit_members um
    where um.organization_id = p_org and um.user_id = p_user
    union
    select c.id from public.units c join tree t on c.parent_id = t.id
  )
  select id from tree;
$$;

-- Заменяет Scope страницы. p_scopes: [{"kind":"organization"} | {"kind":"unit","unit_id":..} | {"kind":"user","user_id":..}]
create or replace function public.replace_page_scopes(p_page uuid, p_scopes jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.require_uid();
  v_org  uuid;
  v_role public.member_role;
  v_item jsonb;
  v_kind public.scope_kind;
  v_unit uuid;
  v_user uuid;
begin
  select organization_id into v_org from public.pages where id = p_page;
  v_role := public.my_role(v_org);

  if p_scopes is null or jsonb_typeof(p_scopes) <> 'array' or jsonb_array_length(p_scopes) = 0 then
    raise exception 'scope_required' using errcode = 'P0001';
  end if;

  delete from public.page_scopes where page_id = p_page;

  for v_item in select * from jsonb_array_elements(p_scopes) loop
    begin
      v_kind := (v_item ->> 'kind')::public.scope_kind;
      v_unit := nullif(v_item ->> 'unit_id', '')::uuid;
      v_user := nullif(v_item ->> 'user_id', '')::uuid;
    exception when others then
      raise exception 'scope_invalid' using errcode = 'P0001';
    end;

    if v_role = 'manager' then
      -- Manager: только свои подразделения (с дочерними) и люди из них.
      if v_kind = 'organization' then
        raise exception 'forbidden' using errcode = 'P0001';
      elsif v_kind = 'unit' and v_unit not in (select public.manager_unit_ids(v_org, v_uid)) then
        raise exception 'forbidden' using errcode = 'P0001';
      elsif v_kind = 'user' and not exists (
        select 1 from public.unit_members um
        where um.user_id = v_user
          and um.unit_id in (select public.manager_unit_ids(v_org, v_uid))
      ) then
        raise exception 'forbidden' using errcode = 'P0001';
      end if;
    end if;

    begin
      insert into public.page_scopes (organization_id, page_id, kind, unit_id, user_id)
      values (
        v_org, p_page, v_kind,
        case when v_kind = 'unit' then v_unit end,
        case when v_kind = 'user' then v_user end
      )
      on conflict do nothing;
    exception
      when foreign_key_violation or check_violation then
        raise exception 'scope_invalid' using errcode = 'P0001';
    end;
  end loop;
end;
$$;

create or replace function public.can_manage_page(p_page uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pages p
    where p.id = p_page
      and (
        public.has_role(p.organization_id, 'owner', 'admin')
        or (public.has_role(p.organization_id, 'manager') and p.created_by = (select auth.uid()))
      )
  );
$$;

create or replace function public.create_page(
  p_org uuid, p_module text, p_name text, p_scopes jsonb,
  p_description text default null, p_icon text default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.require_uid();
  v_page uuid;
begin
  if not public.has_role(p_org, 'owner', 'admin', 'manager') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.org_is_active(p_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.modules m
    join public.organization_modules om on om.module_key = m.key
    where m.key = p_module and m.kind = 'page' and om.organization_id = p_org and om.enabled
  ) then
    raise exception 'module_unavailable' using errcode = 'P0001';
  end if;

  insert into public.pages (organization_id, module_key, name, description, icon, created_by)
  values (p_org, p_module, btrim(p_name), p_description, p_icon, v_uid)
  returning id into v_page;

  perform public.replace_page_scopes(v_page, p_scopes);
  perform public.write_audit(p_org, 'page.created', 'page', v_page,
                             jsonb_build_object('module', p_module, 'scopes', p_scopes));
  return v_page;
end;
$$;

create or replace function public.update_page(
  p_page uuid, p_name text, p_description text default null, p_icon text default null
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_org uuid;
begin
  perform public.require_uid();
  select organization_id into v_org from public.pages where id = p_page;
  if v_org is null or not public.can_manage_page(p_page) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.org_is_active(v_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  update public.pages set name = btrim(p_name), description = p_description, icon = p_icon
  where id = p_page;
  perform public.write_audit(v_org, 'page.updated', 'page', p_page);
end;
$$;

create or replace function public.update_page_scope(p_page uuid, p_scopes jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_org uuid;
begin
  perform public.require_uid();
  select organization_id into v_org from public.pages where id = p_page;
  if v_org is null or not public.can_manage_page(p_page) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.org_is_active(v_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  perform public.replace_page_scopes(p_page, p_scopes);
  perform public.write_audit(v_org, 'page.scope_changed', 'page', p_page, jsonb_build_object('scopes', p_scopes));
end;
$$;

create or replace function public.set_page_archived(p_page uuid, p_archived boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_org uuid;
begin
  perform public.require_uid();
  select organization_id into v_org from public.pages where id = p_page;
  if v_org is null or not public.can_manage_page(p_page) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.org_is_active(v_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  update public.pages
  set status = case when p_archived then 'archived'::public.page_status else 'active'::public.page_status end,
      archived_at = case when p_archived then now() else null end
  where id = p_page;
  perform public.write_audit(v_org, case when p_archived then 'page.archived' else 'page.restored' end,
                             'page', p_page);
end;
$$;

-- ---------- Права на выполнение ----------
revoke execute on function public.require_uid() from public, anon, authenticated;
revoke execute on function public.manager_unit_ids(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.replace_page_scopes(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.can_manage_page(uuid) from public, anon;
grant  execute on function public.can_manage_page(uuid) to authenticated;

revoke execute on function public.admin_activate_subscription(uuid, timestamptz, integer) from public, anon;
revoke execute on function public.create_organization(text, text, text, text, text) from public, anon;
revoke execute on function public.create_invite(uuid) from public, anon;
revoke execute on function public.revoke_invite(uuid) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.leave_organization() from public, anon;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
revoke execute on function public.set_member_role(uuid, uuid, public.member_role) from public, anon;
revoke execute on function public.set_member_position(uuid, uuid, text) from public, anon;
revoke execute on function public.create_page(uuid, text, text, jsonb, text, text) from public, anon;
revoke execute on function public.update_page(uuid, text, text, text) from public, anon;
revoke execute on function public.update_page_scope(uuid, jsonb) from public, anon;
revoke execute on function public.set_page_archived(uuid, boolean) from public, anon;

grant execute on function public.admin_activate_subscription(uuid, timestamptz, integer) to authenticated;
grant execute on function public.create_organization(text, text, text, text, text) to authenticated;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.revoke_invite(uuid) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.leave_organization() to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, public.member_role) to authenticated;
grant execute on function public.set_member_position(uuid, uuid, text) to authenticated;
grant execute on function public.create_page(uuid, text, text, jsonb, text, text) to authenticated;
grant execute on function public.update_page(uuid, text, text, text) to authenticated;
grant execute on function public.update_page_scope(uuid, jsonb) to authenticated;
grant execute on function public.set_page_archived(uuid, boolean) to authenticated;

-- Предпросмотр приглашения доступен и без входа.
revoke execute on function public.get_invite_preview(text) from public;
grant execute on function public.get_invite_preview(text) to anon, authenticated;
