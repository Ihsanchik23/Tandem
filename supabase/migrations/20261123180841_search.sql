-- =====================================================================
-- Tandem · миграция 8 · поиск для каталога «Компании / Люди»
-- Поиск по подстроке без учёта регистра, ускорен индексами pg_trgm.
-- Функции выполняются с правами пользователя (RLS действует).
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

create index profiles_first_name_trgm on public.profiles using gin (first_name extensions.gin_trgm_ops);
create index profiles_last_name_trgm  on public.profiles using gin (last_name extensions.gin_trgm_ops);
create index profiles_username_trgm   on public.profiles using gin (username extensions.gin_trgm_ops);
create index organizations_name_trgm  on public.organizations using gin (name extensions.gin_trgm_ops);
create index profiles_created_idx      on public.profiles (created_at desc);
create index organizations_created_idx on public.organizations (created_at desc);

-- Экранирует % и _ во вводе пользователя.
create or replace function public.like_pattern(p_query text)
returns text
language sql immutable
set search_path = ''
as $$
  select '%' || replace(replace(replace(coalesce(btrim(p_query), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
$$;

create or replace function public.search_people(
  p_query text default '', p_city text default null, p_limit integer default 20, p_offset integer default 0
)
returns table (
  id uuid, username text, first_name text, last_name text, avatar_url text, city text,
  organization_id uuid, organization_name text, organization_logo text, "position" text
)
language sql stable security invoker
set search_path = ''
as $$
  select pr.id, pr.username, pr.first_name, pr.last_name, pr.avatar_url, pr.city,
         o.id, o.name, o.logo_url, m.position
  from public.profiles pr
  left join public.memberships m on m.user_id = pr.id
  left join public.organizations o on o.id = m.organization_id
  where (coalesce(btrim(p_query), '') = ''
         or pr.first_name ilike public.like_pattern(p_query)
         or pr.last_name ilike public.like_pattern(p_query)
         or (pr.first_name || ' ' || pr.last_name) ilike public.like_pattern(p_query)
         or pr.username ilike public.like_pattern(ltrim(p_query, '@')))
    and (p_city is null or pr.city ilike p_city)
  order by (lower(pr.username) = lower(ltrim(coalesce(p_query, ''), '@'))) desc, pr.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.search_organizations(
  p_query text default '', p_city text default null, p_limit integer default 20, p_offset integer default 0
)
returns table (
  id uuid, slug text, name text, logo_url text, city text, description text, members_count bigint
)
language sql stable security invoker
set search_path = ''
as $$
  select o.id, o.slug, o.name, o.logo_url, o.city, o.description,
         (select count(*) from public.memberships m where m.organization_id = o.id)
  from public.organizations o
  where (coalesce(btrim(p_query), '') = '' or o.name ilike public.like_pattern(p_query)
         or o.slug ilike public.like_pattern(p_query))
    and (p_city is null or o.city ilike p_city)
  order by o.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.search_people(text, text, integer, integer) from public, anon;
revoke execute on function public.search_organizations(text, text, integer, integer) from public, anon;
grant execute on function public.search_people(text, text, integer, integer) to authenticated;
grant execute on function public.search_organizations(text, text, integer, integer) to authenticated;
