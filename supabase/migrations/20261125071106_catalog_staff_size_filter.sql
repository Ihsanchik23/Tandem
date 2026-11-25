-- Каталог компаний: фильтр по численности до LIMIT/OFFSET.
-- Отдельная функция сохраняет прежний RPC для уже выпущенных клиентов.
create function public.search_organizations_filtered(
  p_query text default '',
  p_city text default null,
  p_min_members integer default null,
  p_max_members integer default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid, slug text, name text, logo_url text, city text, description text, members_count bigint
)
language sql stable security invoker
set search_path = ''
as $$
  select o.id, o.slug, o.name, o.logo_url, o.city, o.description, staff.members_count
  from public.organizations o
  cross join lateral (
    select count(*) as members_count
    from public.memberships m
    where m.organization_id = o.id
  ) staff
  where (coalesce(btrim(p_query), '') = ''
         or o.name ilike public.like_pattern(p_query)
         or o.slug ilike public.like_pattern(p_query))
    and (p_city is null or o.city ilike p_city)
    and (p_min_members is null or staff.members_count >= greatest(p_min_members, 0))
    and (p_max_members is null or staff.members_count <= p_max_members)
  order by o.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.search_organizations_filtered(text, text, integer, integer, integer, integer) from public, anon;
grant execute on function public.search_organizations_filtered(text, text, integer, integer, integer, integer) to authenticated;
