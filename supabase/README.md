# База данных Tandem

Проект Supabase: `Tandem` (Франкфурт, eu-central-1). Все миграции из этой папки уже применены.
Новые изменения схемы — только новыми файлами в `migrations/`, старые не редактировать.

## Тесты прав
`tests/rls_test.sql` (ядро, 62), `tests/modules_test.sql` (модули, 57), `tests/rate_limit_test.sql` (лимиты, 6), `tests/column_grants_test.sql` (права на столбцы, 11), `tests/unit_branch_test.sql` (удаление ветки, 18). Всего 154 проверки.
На общей базе тесты можно прогнать так: `supabase db query --linked -f supabase/tests/<файл>.sql` (всё откатывается).
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
| Структура | `get_unit_branch_summary(p_unit)` → `{units_count, members_count, will_be_unassigned, pages_count, pages_to_archive}` (любой сотрудник компании), `delete_unit_branch(p_unit)` → `{units_deleted, pages_archived}` (Owner/Admin, активная подписка): удаляет ветку от листьев к корню, области страниц на ветку, страницы без областей — в архив |
| Суперадмин | `admin_activate_subscription(user, paid_until, seats)` |

Подразделения (`units`, `unit_members`) Owner и Admin меняют напрямую через таблицы — права проверяет RLS.

## Что можно менять напрямую (права на столбцы, миграция `column_update_grants`)
| Таблица | Кто (RLS) | Столбцы |
|---|---|---|
| `profiles` | владелец строки | `username`, `first_name`, `last_name`, `avatar_url`, `bio`, `city` |
| `organizations` | Owner/Admin при активной подписке | `name`, `city`, `description`, `logo_url` |

Остальные столбцы (`id`, `slug`, `created_by`, `created_at`, `updated_at`…) напрямую не меняются — отказ 42501.
`anon` не может менять эти таблицы вообще. Новые столбцы по умолчанию тоже закрыты: чтобы открыть — новая миграция с `grant update (...)`.

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
