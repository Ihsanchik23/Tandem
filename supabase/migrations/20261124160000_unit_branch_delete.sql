-- Tandem · удаление ветки подразделений.
-- get_unit_branch_summary — что произойдёт при удалении (для подтверждения в интерфейсе).
-- delete_unit_branch — удаляет подразделение со всеми вложенными в одной транзакции.

-- Подразделение и все вложенные (на любую глубину). Внутренняя функция.
create or replace function public.unit_branch_ids(p_unit uuid)
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  with recursive branch as (
    select id from public.units where id = p_unit
    union
    select u.id from public.units u join branch b on u.parent_id = b.id
  )
  select id from branch;
$$;

create or replace function public.get_unit_branch_summary(p_unit uuid)
returns table (
  units_count integer,        -- подразделение вместе с вложенными
  members_count integer,      -- разные люди в ветке
  will_be_unassigned integer, -- у кого после удаления не останется ни одного подразделения
  pages_count integer,        -- активные страницы, у которых в page_scopes есть подразделения ветки
  pages_to_archive integer    -- из них те, у которых не останется ни одной области доступа
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_ids uuid[];
begin
  perform public.require_uid();
  select organization_id into v_org from public.units where id = p_unit;
  if v_org is null or not public.is_member(v_org) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select array_agg(id) into v_ids from public.unit_branch_ids(p_unit) as b(id);

  return query
  with people as (
    select distinct um.user_id from public.unit_members um where um.unit_id = any (v_ids)
  ),
  affected as (
    select distinct ps.page_id
    from public.page_scopes ps join public.pages p on p.id = ps.page_id
    where ps.unit_id = any (v_ids) and p.status = 'active'
  )
  select
    cardinality(v_ids),
    (select count(*) from people)::integer,
    (select count(*) from people pe
      where not exists (select 1 from public.unit_members um
                        where um.organization_id = v_org and um.user_id = pe.user_id
                          and not (um.unit_id = any (v_ids))))::integer,
    (select count(*) from affected)::integer,
    (select count(*) from affected a
      where not exists (select 1 from public.page_scopes ps
                        where ps.page_id = a.page_id
                          and (ps.unit_id is null or not (ps.unit_id = any (v_ids)))))::integer;
end;
$$;

create or replace function public.delete_unit_branch(p_unit uuid)
returns table (units_deleted integer, pages_archived integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_org      uuid;
  v_ids      uuid[];
  v_pages    uuid[];
  v_page     uuid;
  v_archived integer := 0;
  v_left     integer;
  v_n        integer;
begin
  perform public.require_uid();
  select organization_id into v_org from public.units where id = p_unit;
  if v_org is null or not public.has_role(v_org, 'owner', 'admin') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.org_is_active(v_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;

  -- Блокируем структуру компании, чтобы её не меняли параллельно.
  perform 1 from public.units where organization_id = v_org for update;
  select array_agg(id) into v_ids from public.unit_branch_ids(p_unit) as b(id);

  -- 1. Области видимости страниц на подразделения ветки.
  select array_agg(distinct page_id) into v_pages from public.page_scopes where unit_id = any (v_ids);
  delete from public.page_scopes where unit_id = any (v_ids);

  -- 2. Активные страницы без единой области — в архив существующим механизмом.
  for v_page in
    select p.id from public.pages p
    where p.id = any (coalesce(v_pages, '{}')) and p.status = 'active'
      and not exists (select 1 from public.page_scopes ps where ps.page_id = p.id)
  loop
    perform public.set_page_archived(v_page, true);
    v_archived := v_archived + 1;
  end loop;

  -- 3. Подразделения — от листьев к корню (у parent_id стоит RESTRICT).
  --    Люди из них уходят каскадом unit_members; членство в компании остаётся.
  loop
    delete from public.units u
    where u.id = any (v_ids)
      and not exists (select 1 from public.units c where c.parent_id = u.id);
    get diagnostics v_n = row_count;
    select count(*) into v_left from public.units where id = any (v_ids);
    exit when v_left = 0;
    if v_n = 0 then
      raise exception 'unit_cycle' using errcode = 'P0001';
    end if;
  end loop;

  perform public.write_audit(v_org, 'unit.branch_deleted', 'unit', p_unit,
                             jsonb_build_object('units', cardinality(v_ids), 'pages_archived', v_archived));
  return query select cardinality(v_ids), v_archived;
end;
$$;

revoke execute on function public.unit_branch_ids(uuid) from public, anon, authenticated;
revoke execute on function public.get_unit_branch_summary(uuid) from public, anon;
revoke execute on function public.delete_unit_branch(uuid) from public, anon;
grant execute on function public.get_unit_branch_summary(uuid) to authenticated;
grant execute on function public.delete_unit_branch(uuid) to authenticated;
