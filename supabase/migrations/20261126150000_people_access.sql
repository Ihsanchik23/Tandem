-- =====================================================================
-- Tandem · управление людьми из карточки сотрудника и с холста
--
-- 1. move_unit_member — перевести человека в подразделение одним действием
--    (раньше «добавить» и «удалить» были двумя запросами: при сбое второго
--    человек оставался в обоих подразделениях).
-- 2. grant_page_user / revoke_page_user — дать или забрать индивидуальный
--    доступ к странице (Scope «человек»), не трогая остальной Scope
--    (update_page_scope заменяет его целиком — две правки одновременно
--    затирали бы друг друга).
--
-- Доступ (page_access) пересчитывают существующие триггеры, как и раньше.
-- Функции security definer, поэтому все проверки прав — явно внутри.
-- =====================================================================

-- ---------- Перевод в подразделение ----------
-- p_from — из какого подразделения убрать; null — из всех остальных подразделений компании.
-- Owner/Admin при активной подписке (те же права, что у RLS на unit_members).
create or replace function public.move_unit_member(p_org uuid, p_user uuid, p_to uuid, p_from uuid default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_removed uuid[];
begin
  perform public.require_uid();
  if not public.has_role(p_org, 'owner', 'admin') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.org_is_active(p_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.units u where u.id = p_to and u.organization_id = p_org) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if p_from is not null and not exists (select 1 from public.units u where u.id = p_from and u.organization_id = p_org) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.memberships m where m.organization_id = p_org and m.user_id = p_user) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;

  insert into public.unit_members (organization_id, unit_id, user_id)
  values (p_org, p_to, p_user)
  on conflict do nothing;

  with gone as (
    delete from public.unit_members um
    where um.organization_id = p_org
      and um.user_id = p_user
      and um.unit_id <> p_to
      and (p_from is null or um.unit_id = p_from)
    returning um.unit_id
  )
  select coalesce(array_agg(unit_id), '{}') into v_removed from gone;

  perform public.write_audit(p_org, 'unit_member.moved', 'user', p_user,
                             jsonb_build_object('to', p_to, 'from', to_jsonb(v_removed)));
end;
$$;

-- ---------- Индивидуальный доступ к странице ----------
-- Кто может: тот же, кто меняет Scope страницы (can_manage_page), при активной подписке.
-- Manager — только людям из своих подразделений (как в replace_page_scopes).
create or replace function public.grant_page_user(p_page uuid, p_user uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_uid();
  v_org uuid;
begin
  select organization_id into v_org from public.pages where id = p_page;
  if v_org is null or not public.can_manage_page(p_page) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.org_is_active(v_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.memberships m where m.organization_id = v_org and m.user_id = p_user) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  if public.has_role(v_org, 'manager') and not exists (
    select 1 from public.unit_members um
    where um.user_id = p_user
      and um.unit_id in (select public.manager_unit_ids(v_org, v_uid))
  ) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  insert into public.page_scopes (organization_id, page_id, kind, user_id)
  values (v_org, p_page, 'user', p_user)
  on conflict do nothing;

  perform public.write_audit(v_org, 'page.user_granted', 'page', p_page, jsonb_build_object('user', p_user));
end;
$$;

-- Забрать индивидуальный доступ. Доступ через подразделение или «вся компания» не меняется.
-- Последнюю область страницы убрать нельзя (у страницы всегда есть Scope) — scope_required.
create or replace function public.revoke_page_user(p_page uuid, p_user uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  perform public.require_uid();
  select organization_id into v_org from public.pages where id = p_page;
  if v_org is null or not public.can_manage_page(p_page) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.org_is_active(v_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.page_scopes s
    where s.page_id = p_page and not (s.kind = 'user' and s.user_id = p_user)
  ) then
    raise exception 'scope_required' using errcode = 'P0001';
  end if;

  delete from public.page_scopes s
  where s.page_id = p_page and s.kind = 'user' and s.user_id = p_user;

  perform public.write_audit(v_org, 'page.user_revoked', 'page', p_page, jsonb_build_object('user', p_user));
end;
$$;

revoke execute on function public.move_unit_member(uuid, uuid, uuid, uuid) from public, anon;
revoke execute on function public.grant_page_user(uuid, uuid) from public, anon;
revoke execute on function public.revoke_page_user(uuid, uuid) from public, anon;
grant  execute on function public.move_unit_member(uuid, uuid, uuid, uuid) to authenticated;
grant  execute on function public.grant_page_user(uuid, uuid) to authenticated;
grant  execute on function public.revoke_page_user(uuid, uuid) to authenticated;
