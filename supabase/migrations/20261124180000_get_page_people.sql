-- =====================================================================
-- Tandem · люди с доступом к рабочей странице
-- Нужна для выбора ответственного и соисполнителей задачи: page_access
-- целиком видят только Owner/Admin, а создавать задачи может любой с доступом.
-- Отдаёт список тому, кто сам может открыть страницу, или Owner/Admin компании.
-- Архивная страница — тоже отдаёт (для чтения). Неизвестная страница — forbidden.
-- =====================================================================

create or replace function public.get_page_people(p_page uuid)
returns table (
  user_id    uuid,
  first_name text,
  last_name  text,
  username   text,
  avatar_url text,
  "position" text,
  role       public.member_role
)
language plpgsql stable security definer
set search_path = ''
as $$
declare v_org uuid;
begin
  perform public.require_uid();
  select p.organization_id into v_org from public.pages p where p.id = p_page;
  if v_org is null
     or not public.is_member(v_org)
     or not (public.can_access_page(p_page) or public.has_role(v_org, 'owner', 'admin')) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  return query
  select m.user_id, pr.first_name, pr.last_name, pr.username, pr.avatar_url, m.position, m.role
  from public.page_access a
  join public.memberships m on m.organization_id = a.organization_id and m.user_id = a.user_id
  join public.profiles pr on pr.id = a.user_id
  where a.page_id = p_page
  -- Имя и фамилия могут быть пустыми строками: такие люди — в конце, по username.
  order by nullif(pr.last_name, '') nulls last, nullif(pr.first_name, '') nulls last, pr.username;
end;
$$;

revoke execute on function public.get_page_people(uuid) from public, anon;
grant  execute on function public.get_page_people(uuid) to authenticated;
