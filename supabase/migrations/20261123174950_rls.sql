-- =====================================================================
-- Tandem · миграция 3 · RLS-политики
-- По умолчанию всё запрещено. Разрешено только то, что описано ниже.
-- Сложные изменения (компания, членство, страницы, Scope) — только через RPC.
-- Режим «только чтение» при истёкшей подписке: все записи требуют org_is_active.
-- =====================================================================

alter table public.profiles             enable row level security;
alter table public.platform_admins      enable row level security;
alter table public.organizations        enable row level security;
alter table public.organization_founders enable row level security;
alter table public.memberships          enable row level security;
alter table public.units                enable row level security;
alter table public.unit_members         enable row level security;
alter table public.modules              enable row level security;
alter table public.organization_modules enable row level security;
alter table public.pages                enable row level security;
alter table public.page_scopes          enable row level security;
alter table public.page_access          enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.invites              enable row level security;
alter table public.audit_log            enable row level security;

-- ---------- Профили: видны всем вошедшим, меняет только владелец ----------
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy platform_admins_select_self on public.platform_admins
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------- Компании: публичный профиль; правят Owner и Admin ----------
create policy organizations_select on public.organizations
  for select to authenticated using (true);
create policy organizations_update on public.organizations
  for update to authenticated
  using (public.has_role(id, 'owner', 'admin') and public.org_is_active(id))
  with check (public.has_role(id, 'owner', 'admin') and public.org_is_active(id));

create policy organization_founders_select on public.organization_founders
  for select to authenticated using (true);
create policy organization_founders_insert on public.organization_founders
  for insert to authenticated
  with check (public.has_role(organization_id, 'owner', 'admin')
              and public.org_is_active(organization_id)
              and exists (select 1 from public.memberships m
                          where m.organization_id = organization_founders.organization_id
                            and m.user_id = organization_founders.user_id));
create policy organization_founders_delete on public.organization_founders
  for delete to authenticated
  using (public.has_role(organization_id, 'owner', 'admin') and public.org_is_active(organization_id));

-- ---------- Членство: место работы и должность публичны; изменения — через RPC ----------
create policy memberships_select on public.memberships
  for select to authenticated using (true);

-- ---------- Подразделения: видят сотрудники; меняют Owner и Admin ----------
create policy units_select on public.units
  for select to authenticated using (public.is_member(organization_id));
create policy units_insert on public.units
  for insert to authenticated
  with check (public.has_role(organization_id, 'owner', 'admin') and public.org_is_active(organization_id));
create policy units_update on public.units
  for update to authenticated
  using (public.has_role(organization_id, 'owner', 'admin') and public.org_is_active(organization_id))
  with check (public.has_role(organization_id, 'owner', 'admin') and public.org_is_active(organization_id));
create policy units_delete on public.units
  for delete to authenticated
  using (public.has_role(organization_id, 'owner', 'admin') and public.org_is_active(organization_id));

create policy unit_members_select on public.unit_members
  for select to authenticated using (public.is_member(organization_id));
create policy unit_members_insert on public.unit_members
  for insert to authenticated
  with check (public.has_role(organization_id, 'owner', 'admin') and public.org_is_active(organization_id));
create policy unit_members_delete on public.unit_members
  for delete to authenticated
  using (public.has_role(organization_id, 'owner', 'admin') and public.org_is_active(organization_id));

-- ---------- Модули ----------
create policy modules_select on public.modules
  for select to authenticated using (true);
create policy organization_modules_select on public.organization_modules
  for select to authenticated using (public.is_member(organization_id));

-- ---------- Страницы и Scope: метаданные видят все сотрудники (Canvas с замками) ----------
-- Содержимое страниц (задачи, сообщения) будет проверяться через can_access_page().
create policy pages_select on public.pages
  for select to authenticated using (public.is_member(organization_id));
create policy page_scopes_select on public.page_scopes
  for select to authenticated using (public.is_member(organization_id));
create policy page_access_select on public.page_access
  for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role(organization_id, 'owner', 'admin'));

-- ---------- Подписки, приглашения, журнал ----------
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (owner_user_id = (select auth.uid())
         or (organization_id is not null and public.has_role(organization_id, 'owner')));
create policy invites_select on public.invites
  for select to authenticated using (public.has_role(organization_id, 'owner', 'admin'));
create policy audit_log_select on public.audit_log
  for select to authenticated using (public.has_role(organization_id, 'owner', 'admin'));
