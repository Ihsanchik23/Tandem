-- =====================================================================
-- Tandem · личная расстановка карточек на «Структуре» (canvas_prefs, ТЗ раздел 5)
-- У каждого сотрудника своя: на других она не влияет. Одна строка на человека в компании,
-- места карточек — в jsonb {"<id карточки>": [x, y]}.
-- Читать — только свою строку (RLS). Менять — только через RPC save_canvas_positions.
-- Подписку не проверяем: это личное удобство просмотра, а не рабочие данные.
-- =====================================================================

create table public.canvas_prefs (
  organization_id uuid not null,
  user_id         uuid not null,
  positions       jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now(),
  primary key (organization_id, user_id),
  -- Вышел или удалён из компании — его расстановка удаляется вместе с членством.
  foreign key (organization_id, user_id)
    references public.memberships (organization_id, user_id) on delete cascade,
  constraint canvas_prefs_positions_object check (jsonb_typeof(positions) = 'object'),
  constraint canvas_prefs_positions_size check (pg_column_size(positions) <= 262144)
);
create trigger canvas_prefs_updated_at before update on public.canvas_prefs
  for each row execute function public.set_updated_at();

alter table public.canvas_prefs enable row level security;

-- Только своя строка и только в своей компании.
create policy canvas_prefs_select on public.canvas_prefs
  for select to authenticated
  using (user_id = (select auth.uid()) and public.is_member(organization_id));

-- Прямых изменений нет — только RPC ниже.
revoke insert, update, delete, truncate on public.canvas_prefs from anon, authenticated;
revoke select on public.canvas_prefs from anon;

-- Сохранить свою расстановку целиком ('{}' — «вернуть на места»).
-- Проверка: объект, не больше 2000 карточек, у каждой [x, y] — два конечных числа в разумных пределах.
create or replace function public.save_canvas_positions(p_org uuid, p_positions jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_uid();
  v_key text;
  v_val jsonb;
begin
  if not public.is_member(p_org) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_positions is null or jsonb_typeof(p_positions) <> 'object' then
    raise exception 'invalid_positions' using errcode = 'P0001';
  end if;
  if (select count(*) from jsonb_object_keys(p_positions)) > 2000 then
    raise exception 'invalid_positions' using errcode = 'P0001';
  end if;
  for v_key, v_val in select key, value from jsonb_each(p_positions) loop
    if char_length(v_key) > 80
       or jsonb_typeof(v_val) <> 'array' or jsonb_array_length(v_val) <> 2
       or jsonb_typeof(v_val -> 0) <> 'number' or jsonb_typeof(v_val -> 1) <> 'number'
       or abs((v_val ->> 0)::numeric) > 1000000 or abs((v_val ->> 1)::numeric) > 1000000 then
      raise exception 'invalid_positions' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.canvas_prefs (organization_id, user_id, positions)
  values (p_org, v_uid, p_positions)
  on conflict (organization_id, user_id) do update set positions = excluded.positions;
end;
$$;

revoke execute on function public.save_canvas_positions(uuid, jsonb) from public, anon;
grant  execute on function public.save_canvas_positions(uuid, jsonb) to authenticated;
