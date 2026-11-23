-- =====================================================================
-- Tandem · миграция 1 · ядро схемы
-- Профили, компании, членство, подразделения, модули, рабочие страницы,
-- Scope, вычисляемый доступ, подписки, приглашения, журнал.
-- Каждая рабочая таблица содержит organization_id.
-- =====================================================================

-- ---------- Типы ----------
create type public.member_role as enum ('owner', 'admin', 'manager', 'employee');
create type public.page_status as enum ('active', 'archived');
create type public.scope_kind as enum ('organization', 'unit', 'user');
create type public.subscription_status as enum ('active', 'expired', 'canceled');
create type public.module_kind as enum ('page', 'company');

-- ---------- Общая функция updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Профили ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  first_name  text not null default '' check (char_length(first_name) <= 60),
  last_name   text not null default '' check (char_length(last_name) <= 60),
  avatar_url  text,
  bio         text check (char_length(bio) <= 300),
  city        text check (char_length(city) <= 60),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Профиль создаётся автоматически при регистрации.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := 'user_' || right(replace(new.id::text, '-', ''), 12);
begin
  -- Автоматический username; пользователь потом может его изменить.
  while exists (select 1 from public.profiles where username = v_username) loop
    v_username := 'user_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  end loop;
  insert into public.profiles (id, username, first_name, last_name)
  values (
    new.id,
    v_username,
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 60),
    left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 60)
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Суперадминистраторы платформы (вы). Добавляются вручную через SQL.
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- ---------- Компании ----------
create table public.organizations (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name         text not null check (char_length(btrim(name)) between 1 and 100),
  description  text check (char_length(description) <= 1000),
  logo_url     text,
  city         text check (char_length(city) <= 60),
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_founders (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  primary key (organization_id, user_id)
);

-- ---------- Членство ----------
create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role            public.member_role not null default 'employee',
  position        text check (char_length(position) <= 100),
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);
-- ПИЛОТ: один человек — одна компания. Чтобы разрешить несколько, удалить этот индекс.
create unique index memberships_one_org_per_user on public.memberships (user_id);
create unique index memberships_one_owner on public.memberships (organization_id) where role = 'owner';

-- ---------- Подразделения (дерево Canvas) ----------
create table public.units (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  parent_id       uuid,
  name            text not null check (char_length(btrim(name)) between 1 and 100),
  address         text check (char_length(address) <= 200),
  head_user_id    uuid,
  lat             double precision check (lat between -90 and 90),
  lng             double precision check (lng between -180 and 180),
  radius_m        integer not null default 50 check (radius_m between 10 and 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, id),
  check (parent_id is null or parent_id <> id),
  check ((lat is null) = (lng is null)),
  foreign key (organization_id, parent_id)
    references public.units (organization_id, id) on delete restrict,
  foreign key (organization_id, head_user_id)
    references public.memberships (organization_id, user_id) on delete set null (head_user_id)
);
create unique index units_name_per_parent on public.units (
  organization_id,
  coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(btrim(name))
);
create index units_parent_idx on public.units (parent_id);
create trigger units_updated_at before update on public.units
  for each row execute function public.set_updated_at();

create table public.unit_members (
  organization_id uuid not null,
  unit_id         uuid not null,
  user_id         uuid not null,
  created_at      timestamptz not null default now(),
  primary key (unit_id, user_id),
  foreign key (organization_id, unit_id)
    references public.units (organization_id, id) on delete cascade,
  foreign key (organization_id, user_id)
    references public.memberships (organization_id, user_id) on delete cascade
);
create index unit_members_user_idx on public.unit_members (organization_id, user_id);

-- ---------- Модули ----------
create table public.modules (
  key   text primary key,
  kind  public.module_kind not null,
  name  text not null
);
insert into public.modules (key, kind, name) values
  ('tasks', 'page', 'Задачи'),
  ('chat', 'page', 'Чат'),
  ('attendance', 'company', 'Отметки');

create table public.organization_modules (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  module_key      text not null references public.modules (key),
  enabled         boolean not null default true,
  primary key (organization_id, module_key)
);

-- ---------- Рабочие страницы ----------
create table public.pages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  module_key      text not null references public.modules (key),
  name            text not null check (char_length(btrim(name)) between 1 and 100),
  description     text check (char_length(description) <= 500),
  icon            text check (char_length(icon) <= 50),
  status          public.page_status not null default 'active',
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz,
  unique (organization_id, id),
  check ((status = 'archived') = (archived_at is not null))
);
create index pages_org_idx on public.pages (organization_id, status);
create trigger pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

-- Кому назначена страница. Наследование по дереву вниз считается в page_access.
create table public.page_scopes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  page_id         uuid not null,
  kind            public.scope_kind not null,
  unit_id         uuid,
  user_id         uuid,
  foreign key (organization_id, page_id)
    references public.pages (organization_id, id) on delete cascade,
  foreign key (organization_id, unit_id)
    references public.units (organization_id, id) on delete restrict,
  foreign key (organization_id, user_id)
    references public.memberships (organization_id, user_id) on delete cascade,
  check (
    (kind = 'organization' and unit_id is null and user_id is null) or
    (kind = 'unit' and unit_id is not null and user_id is null) or
    (kind = 'user' and user_id is not null and unit_id is null)
  )
);
create unique index page_scopes_org_uq on public.page_scopes (page_id) where kind = 'organization';
create unique index page_scopes_unit_uq on public.page_scopes (page_id, unit_id) where kind = 'unit';
create unique index page_scopes_user_uq on public.page_scopes (page_id, user_id) where kind = 'user';
create index page_scopes_unit_idx on public.page_scopes (unit_id);

-- Вычисленный доступ: кто видит содержимое страницы. Пишет только сервер.
create table public.page_access (
  organization_id uuid not null,
  page_id         uuid not null,
  user_id         uuid not null,
  primary key (page_id, user_id),
  foreign key (organization_id, page_id)
    references public.pages (organization_id, id) on delete cascade
);
create index page_access_user_idx on public.page_access (user_id);

-- ---------- Подписки ----------
-- Подписку активирует суперадмин для пользователя; компания привязывается при создании.
create table public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid unique references public.organizations (id) on delete set null,
  plan            text not null default 'team' check (plan in ('team')),
  status          public.subscription_status not null default 'active',
  seats           integer not null default 15 check (seats >= 15),
  paid_until      timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index subscriptions_owner_idx on public.subscriptions (owner_user_id);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------- Приглашения ----------
create table public.invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  token           text not null unique
                    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  created_by      uuid references public.profiles (id) on delete set null,
  expires_at      timestamptz not null default now() + interval '3 days',
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index invites_org_idx on public.invites (organization_id);

-- ---------- Журнал административных действий ----------
create table public.audit_log (
  id              bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete cascade,
  actor_id        uuid references public.profiles (id) on delete set null,
  action          text not null,
  target_type     text,
  target_id       uuid,
  details         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index audit_log_org_idx on public.audit_log (organization_id, created_at desc);
