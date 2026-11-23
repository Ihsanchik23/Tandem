-- =====================================================================
-- Tandem · миграция 6 · модуль «Чат» и раздел «Сообщения»
-- Участники чата = все, у кого есть доступ к странице.
-- Отправка идемпотентна: client_id генерирует клиент; повтор не создаёт дубль.
-- =====================================================================

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  page_id         uuid not null,
  author_id       uuid references public.profiles (id) on delete set null,
  client_id       uuid not null unique,
  body            text check (char_length(body) <= 4000),
  reply_to_id     uuid references public.messages (id) on delete set null,
  created_at      timestamptz not null default clock_timestamp(),
  deleted_at      timestamptz,
  foreign key (organization_id, page_id)
    references public.pages (organization_id, id) on delete cascade,
  check (deleted_at is not null or char_length(btrim(body)) >= 1)
);
create index messages_page_idx on public.messages (page_id, created_at desc);

create table public.chat_reads (
  organization_id uuid not null,
  page_id         uuid not null,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (page_id, user_id),
  foreign key (organization_id, page_id)
    references public.pages (organization_id, id) on delete cascade
);

-- ---------- RPC ----------
-- Возвращает id сообщения. Повтор с тем же client_id возвращает уже созданное.
create or replace function public.send_message(
  p_page uuid, p_client_id uuid, p_body text, p_reply_to uuid default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_uid();
  v_org uuid;
  v_id  uuid;
begin
  select id into v_id from public.messages where client_id = p_client_id and author_id = v_uid;
  if v_id is not null then
    return v_id;
  end if;

  select p.organization_id into v_org from public.pages p
  where p.id = p_page and p.module_key = 'chat' and p.status = 'active'
    and public.org_is_active(p.organization_id) and public.can_access_page(p.id);
  if v_org is null then
    raise exception 'page_unavailable' using errcode = 'P0001';
  end if;

  if p_reply_to is not null and not exists (
    select 1 from public.messages m where m.id = p_reply_to and m.page_id = p_page
  ) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  insert into public.messages (organization_id, page_id, author_id, client_id, body, reply_to_id)
  values (v_org, p_page, v_uid, p_client_id, btrim(p_body), p_reply_to)
  returning id into v_id;

  -- Своё сообщение сразу прочитано.
  insert into public.chat_reads (organization_id, page_id, user_id, last_read_at)
  values (v_org, p_page, v_uid, clock_timestamp())
  on conflict (page_id, user_id) do update set last_read_at = excluded.last_read_at;
  return v_id;
end;
$$;

-- Удалить своё сообщение; Owner, Admin и Manager с доступом — любое на странице.
create or replace function public.delete_message(p_message uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_uid();
  v_m   public.messages%rowtype;
begin
  select * into v_m from public.messages where id = p_message;
  if v_m.id is null or v_m.deleted_at is not null or not public.can_access_page(v_m.page_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_m.author_id is distinct from v_uid
     and not public.has_role(v_m.organization_id, 'owner', 'admin', 'manager') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update public.messages set body = null, deleted_at = now() where id = p_message;
  if v_m.author_id is distinct from v_uid then
    perform public.write_audit(v_m.organization_id, 'message.deleted_by_moderator', 'message', p_message);
  end if;
end;
$$;

create or replace function public.mark_chat_read(p_page uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_uid();
  v_org uuid;
begin
  select organization_id into v_org from public.pages where id = p_page and module_key = 'chat';
  if v_org is null or not public.can_access_page(p_page) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  insert into public.chat_reads (organization_id, page_id, user_id, last_read_at)
  values (v_org, p_page, v_uid, clock_timestamp())
  on conflict (page_id, user_id) do update set last_read_at = excluded.last_read_at;
end;
$$;

-- Раздел «Сообщения»: доступные чаты, последнее сообщение, непрочитанные. Новые сверху.
create or replace function public.get_my_chats()
returns table (
  page_id uuid, organization_id uuid, name text, icon text, status public.page_status,
  last_message_at timestamptz, last_message_body text, last_message_author uuid,
  unread_count bigint
)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.organization_id, p.name, p.icon, p.status,
         lm.created_at, lm.body, lm.author_id,
         (select count(*) from public.messages m
          where m.page_id = p.id and m.deleted_at is null
            and m.author_id is distinct from (select auth.uid())
            and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)) as unread_count
  from public.page_access a
  join public.pages p on p.id = a.page_id and p.module_key = 'chat'
  left join public.chat_reads r on r.page_id = p.id and r.user_id = a.user_id
  left join lateral (
    select m.created_at, m.body, m.author_id from public.messages m
    where m.page_id = p.id
    order by m.created_at desc limit 1
  ) lm on true
  where a.user_id = (select auth.uid())
  order by coalesce(lm.created_at, p.created_at) desc;
$$;

-- ---------- RLS ----------
alter table public.messages   enable row level security;
alter table public.chat_reads enable row level security;

create policy messages_select on public.messages
  for select to authenticated using (public.can_access_page(page_id));
create policy chat_reads_select_own on public.chat_reads
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------- Права на выполнение ----------
revoke execute on function public.send_message(uuid, uuid, text, uuid) from public, anon;
revoke execute on function public.delete_message(uuid) from public, anon;
revoke execute on function public.mark_chat_read(uuid) from public, anon;
revoke execute on function public.get_my_chats() from public, anon;
grant execute on function public.send_message(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.delete_message(uuid) to authenticated;
grant execute on function public.mark_chat_read(uuid) to authenticated;
grant execute on function public.get_my_chats() to authenticated;
