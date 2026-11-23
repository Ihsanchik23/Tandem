-- =====================================================================
-- Tandem · миграция 7 · модуль «Отметки» (GPS)
-- Клиент присылает координаты и точность. Расстояние и время считает сервер.
-- Каждая попытка (и успешная, и отклонённая) записывается в журнал отметок.
-- Результаты: accepted, out_of_range, low_accuracy, no_point,
--             already_checked_in, not_checked_in
-- =====================================================================

create type public.attendance_kind as enum ('check_in', 'check_out');

create table public.attendance_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  unit_id         uuid,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  kind            public.attendance_kind not null,
  result          text not null,
  lat             double precision,
  lng             double precision,
  accuracy_m      double precision,
  distance_m      double precision,
  created_at      timestamptz not null default clock_timestamp(),
  foreign key (organization_id, unit_id)
    references public.units (organization_id, id) on delete set null (unit_id)
);
create index attendance_org_day_idx on public.attendance_events (organization_id, created_at desc);
create index attendance_user_idx on public.attendance_events (user_id, created_at desc);

-- Допустимая погрешность GPS, метров. Хуже — просим подойти к окну или повторить.
create or replace function public.attendance_max_accuracy()
returns double precision language sql immutable set search_path = '' as $$ select 100::double precision $$;

-- Расстояние между точками по формуле гаверсинусов, метров.
create or replace function public.distance_m(lat1 double precision, lng1 double precision,
                                             lat2 double precision, lng2 double precision)
returns double precision
language sql immutable
set search_path = ''
as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

create or replace function public.check_attendance(
  p_kind public.attendance_kind, p_lat double precision, p_lng double precision, p_accuracy_m double precision
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid    uuid := public.require_uid();
  v_org    uuid;
  v_unit   record;
  v_last   public.attendance_kind;
  v_result text;
begin
  select organization_id into v_org from public.memberships where user_id = v_uid;
  if v_org is null then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  if not public.org_is_active(v_org) then
    raise exception 'subscription_inactive' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.organization_modules
                 where organization_id = v_org and module_key = 'attendance' and enabled) then
    raise exception 'module_unavailable' using errcode = 'P0001';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid_location' using errcode = 'P0001';
  end if;

  -- Ближайшая точка среди подразделений, где человек состоит напрямую.
  select u.id, u.name, u.radius_m, public.distance_m(p_lat, p_lng, u.lat, u.lng) as dist
  into v_unit
  from public.unit_members um
  join public.units u on u.id = um.unit_id
  where um.user_id = v_uid and um.organization_id = v_org and u.lat is not null
  order by 4 asc
  limit 1;

  select kind into v_last from public.attendance_events
  where user_id = v_uid and organization_id = v_org and result = 'accepted'
  order by created_at desc limit 1;

  v_result := case
    when v_unit.id is null then 'no_point'
    when p_accuracy_m is null or p_accuracy_m > public.attendance_max_accuracy() then 'low_accuracy'
    when v_unit.dist > v_unit.radius_m then 'out_of_range'
    when p_kind = 'check_in' and v_last = 'check_in' then 'already_checked_in'
    when p_kind = 'check_out' and v_last is distinct from 'check_in' then 'not_checked_in'
    else 'accepted'
  end;

  insert into public.attendance_events
    (organization_id, unit_id, user_id, kind, result, lat, lng, accuracy_m, distance_m)
  values (v_org, v_unit.id, v_uid, p_kind, v_result, p_lat, p_lng, p_accuracy_m, round(v_unit.dist::numeric, 1));

  return jsonb_build_object(
    'result', v_result,
    'unit_id', v_unit.id,
    'unit_name', v_unit.name,
    'distance_m', round(v_unit.dist::numeric),
    'radius_m', v_unit.radius_m,
    'at', clock_timestamp()
  );
end;
$$;

-- Подразделения текущего пользователя и их дочерние (для Manager).
create or replace function public.my_unit_subtree(p_org uuid)
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select public.manager_unit_ids(p_org, (select auth.uid()));
$$;
revoke execute on function public.my_unit_subtree(uuid) from public, anon;
grant execute on function public.my_unit_subtree(uuid) to authenticated;
revoke execute on function public.distance_m(double precision, double precision, double precision, double precision) from public, anon;
revoke execute on function public.attendance_max_accuracy() from public, anon;
grant execute on function public.distance_m(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.attendance_max_accuracy() to authenticated;

-- ---------- RLS ----------
-- Свои отметки видит каждый; Owner и Admin — все; Manager — своих подразделений.
alter table public.attendance_events enable row level security;
create policy attendance_select on public.attendance_events
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_role(organization_id, 'owner', 'admin')
    or (public.has_role(organization_id, 'manager')
        and unit_id in (select public.my_unit_subtree(organization_id)))
  );

revoke execute on function public.check_attendance(public.attendance_kind, double precision, double precision, double precision) from public, anon;
grant execute on function public.check_attendance(public.attendance_kind, double precision, double precision, double precision) to authenticated;
