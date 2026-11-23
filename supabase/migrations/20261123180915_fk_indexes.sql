-- Tandem · миграция 10 · индексы под внешние ключи (по советам Supabase)
-- Ускоряют каскадное удаление и выборки по странице/подразделению.
create index units_org_parent_idx           on public.units (organization_id, parent_id);
create index units_org_head_idx             on public.units (organization_id, head_user_id);
create index unit_members_org_unit_idx      on public.unit_members (organization_id, unit_id);
create index page_scopes_org_page_idx       on public.page_scopes (organization_id, page_id);
create index page_scopes_org_unit_idx       on public.page_scopes (organization_id, unit_id);
create index page_scopes_org_user_idx       on public.page_scopes (organization_id, user_id);
create index page_access_org_page_idx       on public.page_access (organization_id, page_id);
create index tasks_org_page_idx             on public.tasks (organization_id, page_id);
create index tasks_org_assignee_idx         on public.tasks (organization_id, assignee_id);
create index tasks_parent_idx               on public.tasks (parent_task_id);
create index task_coassignees_org_task_idx  on public.task_coassignees (organization_id, task_id);
create index task_coassignees_org_user_idx  on public.task_coassignees (organization_id, user_id);
create index task_comments_org_task_idx     on public.task_comments (organization_id, task_id);
create index task_events_org_task_idx       on public.task_events (organization_id, task_id);
create index messages_org_page_idx          on public.messages (organization_id, page_id);
create index messages_reply_idx             on public.messages (reply_to_id);
create index chat_reads_org_page_idx        on public.chat_reads (organization_id, page_id);
create index chat_reads_user_idx            on public.chat_reads (user_id);
create index attendance_org_unit_idx        on public.attendance_events (organization_id, unit_id);
create index organization_founders_user_idx on public.organization_founders (user_id);
