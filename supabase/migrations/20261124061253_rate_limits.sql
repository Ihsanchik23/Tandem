-- =====================================================================
-- Tandem · миграция 11 · ограничение частоты
-- Сообщения: не больше 30 в минуту на человека.
-- Комментарии к задачам: не больше 30 в минуту на человека.
-- Новые задачи: не больше 60 в час на человека.
-- Превышение даёт ошибку rate_limited.
-- =====================================================================

create index if not exists messages_author_created_idx on public.messages (author_id, created_at desc);
create index if not exists task_comments_author_created_idx on public.task_comments (author_id, created_at desc);
create index if not exists tasks_creator_created_idx on public.tasks (created_by, created_at desc);

create or replace function public.limit_messages()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.author_id is not null and (
    select count(*) from public.messages
    where author_id = new.author_id and created_at > clock_timestamp() - interval '1 minute'
  ) >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.limit_task_comments()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.author_id is not null and (
    select count(*) from public.task_comments
    where author_id = new.author_id and created_at > clock_timestamp() - interval '1 minute'
  ) >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.limit_tasks()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.created_by is not null and (
    select count(*) from public.tasks
    where created_by = new.created_by and created_at > clock_timestamp() - interval '1 hour'
  ) >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.limit_messages();
create trigger task_comments_rate_limit before insert on public.task_comments
  for each row execute function public.limit_task_comments();
create trigger tasks_rate_limit before insert on public.tasks
  for each row execute function public.limit_tasks();

revoke execute on function public.limit_messages() from public, anon, authenticated;
revoke execute on function public.limit_task_comments() from public, anon, authenticated;
revoke execute on function public.limit_tasks() from public, anon, authenticated;
