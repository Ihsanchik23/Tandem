-- =====================================================================
-- Tandem · доступ к странице подразделения — вниз и вверх по дереву
--
-- Было: страница подразделения доступна его сотрудникам и сотрудникам
--       всех дочерних подразделений. Вверх доступ не шёл.
-- Стало: ещё и сотрудникам всех родительских подразделений до корня.
--       Соседним веткам по-прежнему не доступна.
--
-- Пример: Семей → Точка 1, Точка 2.
--   Страница Семея   — Семей, Точка 1, Точка 2.
--   Страница Точки 1 — Точка 1 и Семей. Точка 2 не видит.
-- Owner/Admin — всё; Scope «вся компания» и «человек» не меняются.
--
-- Меняется только recompute_page_access (последняя версия — из миграции tasks:
-- после пересчёта снимает ответственных и соисполнителей без доступа — сохраняем).
-- Циклы в дереве запрещены схемой (units_guard), но обе рекурсии всё равно
-- ограничены глубиной 100.
-- В конце — пересчёт доступа для всех компаний.
-- =====================================================================

create or replace function public.recompute_page_access(p_org uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));

  delete from public.page_access where organization_id = p_org;

  insert into public.page_access (organization_id, page_id, user_id)
  with recursive
  -- Вниз: подразделение (root_id) → оно само и все дочерние на любую глубину.
  down as (
    select u.id as root_id, u.id as unit_id, 0 as depth
    from public.units u
    where u.organization_id = p_org
    union all
    select d.root_id, c.id, d.depth + 1
    from down d
    join public.units c on c.parent_id = d.unit_id
    where d.depth < 100
  ),
  -- Вверх: подразделение (root_id) → все родительские до корня (без него самого).
  up as (
    select u.id as root_id, u.parent_id as unit_id, 1 as depth
    from public.units u
    where u.organization_id = p_org and u.parent_id is not null
    union all
    select a.root_id, p.parent_id, a.depth + 1
    from up a
    join public.units p on p.id = a.unit_id
    where p.parent_id is not null and a.depth < 100
  ),
  grants as (
    -- Owner и Admin видят все страницы компании.
    select p.id as page_id, m.user_id
    from public.pages p
    join public.memberships m
      on m.organization_id = p.organization_id and m.role in ('owner', 'admin')
    where p.organization_id = p_org
    union
    -- Вся компания.
    select s.page_id, m.user_id
    from public.page_scopes s
    join public.memberships m on m.organization_id = s.organization_id
    where s.organization_id = p_org and s.kind = 'organization'
    union
    -- Отдельный человек.
    select s.page_id, s.user_id
    from public.page_scopes s
    where s.organization_id = p_org and s.kind = 'user'
    union
    -- Подразделение: его сотрудники и сотрудники всех дочерних.
    select s.page_id, um.user_id
    from public.page_scopes s
    join down d on d.root_id = s.unit_id
    join public.unit_members um on um.unit_id = d.unit_id
    where s.organization_id = p_org and s.kind = 'unit'
    union
    -- Подразделение: сотрудники всех родительских до корня (новое).
    select s.page_id, um.user_id
    from public.page_scopes s
    join up a on a.root_id = s.unit_id
    join public.unit_members um on um.unit_id = a.unit_id
    where s.organization_id = p_org and s.kind = 'unit'
  )
  select p_org, g.page_id, g.user_id from grants g;

  -- Потеря доступа снимает назначения (как раньше).
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

-- Пересчитать доступ во всех компаниях по новому правилу.
-- Новое правило только добавляет доступ, поэтому ни у кого он не пропадёт
-- и назначения в задачах не снимутся.
do $$
declare v_org uuid;
begin
  for v_org in select id from public.organizations loop
    perform public.recompute_page_access(v_org);
  end loop;
end;
$$;
