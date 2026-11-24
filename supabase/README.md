# База данных Tandem

Проект Supabase: `Tandem` (Франкфурт, eu-central-1). Все миграции из этой папки уже применены.
Новые изменения схемы — только новыми файлами в `migrations/`, старые не редактировать.

## Тесты прав
`tests/rls_test.sql` (ядро, 62), `tests/modules_test.sql` (модули, 57), `tests/rate_limit_test.sql` (лимиты, 6). Всего 125 проверок.
Запускаются на локальной базе (`supabase start`) через psql; всё в транзакции с откатом.

## Серверные функции (вызов: `supabase.rpc('имя', {...})`)

| Раздел | Функции |
|---|---|
| Компания | `create_organization`, `create_invite`, `revoke_invite`, `get_invite_preview` (без входа), `accept_invite`, `leave_organization`, `remove_member`, `set_member_role`, `set_member_position` |
| Страницы | `create_page`, `update_page`, `update_page_scope`, `set_page_archived`, `can_access_page`, `can_manage_page` |
| Задачи | `create_task`, `update_task` (с версией), `set_task_assignees` (с версией), `set_task_status`, `set_task_archived`, `add_task_comment`, `edit_task_comment`, `delete_task_comment`, `can_edit_task`, `can_work_task` |
| Чат | `send_message` (client_id для повтора без дублей), `delete_message`, `mark_chat_read`, `get_my_chats` |
| Отметки | `check_attendance(kind, lat, lng, accuracy_m)` → `{result, unit_name, distance_m, radius_m}` |
| Каталог | `search_people`, `search_organizations` |
| Суперадмин | `admin_activate_subscription(user, paid_until, seats)` |

Подразделения (`units`, `unit_members`) Owner и Admin меняют напрямую через таблицы — права проверяет RLS.

## Коды ошибок (message) → текст в интерфейсе
not_authenticated, forbidden, subscription_required, subscription_inactive, already_member,
already_member_here, not_member, owner_cannot_leave, invite_invalid, no_free_seats,
module_unavailable, scope_required, scope_invalid, not_found, invalid_role, unit_cycle,
page_unavailable, task_conflict, due_in_past, self_assign_forbidden, assignee_no_access,
invalid_location, rate_limited (больше 30 сообщений или комментариев в минуту, 60 задач в час).

## Результаты GPS-отметки
accepted, out_of_range, low_accuracy (погрешность > 100 м), no_point (у филиала не задана точка),
already_checked_in, not_checked_in.

## Хранилище
`avatars/<user_id>/файл` — свой аватар; `logos/<organization_id>/файл` — Owner/Admin. До 2 МБ, jpeg/png/webp.

## Realtime
Подписка на `messages`, `tasks`, `task_comments` — события приходят только тем, кому RLS разрешает строку.
