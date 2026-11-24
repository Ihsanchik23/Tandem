---
name: tandem-supabase
description: Как фронтенд Tandem работает с готовой базой Supabase — вызовы RPC, коды ошибок, Realtime, загрузка картинок, GPS-отметки. Использовать при любой работе с данными: экраны компании, Canvas, страницы, задачи, чат, каталог, отметки.
---

# Tandem: работа с базой Supabase

База уже создана и покрыта тестами прав. Схема описана в `supabase/README.md`, SQL — в `supabase/migrations/`.
**Не создавай и не меняй миграции.** Если для экрана не хватает данных или функции — остановись и опиши, чего не хватает.

## Главные правила

1. **Чтение** — обычные запросы `supabase.from('таблица').select(...)`. RLS сам отдаёт только разрешённое.
   Не дублируй проверки прав на клиенте ради безопасности; на клиенте только для показа/скрытия кнопок.
2. **Изменения** — только через RPC: `supabase.rpc('имя', { p_...: ... })`.
   Исключение: Owner/Admin меняют `units` и `unit_members` напрямую (insert/update/delete) — RLS проверяет права.
   Профиль пользователь меняет напрямую: `profiles.update(...)` только своей строки и только столбцы
   `username, first_name, last_name, avatar_url, bio, city`.
   Профиль компании Owner/Admin меняют напрямую: `organizations.update(...)` только `name, city, description, logo_url`
   (`slug` после создания не меняется). Остальные столбцы закрыты правами — ошибка 42501.
3. **Ошибки** — RPC возвращает `error.message` с кодом. Переводи коды в текст через `src/lib/i18n` (таблица ниже).
   Неизвестный код → общий текст «Не удалось выполнить действие. Попробуйте ещё раз».
4. **Никогда** не используй `service_role` ключ в клиентском коде и в `NEXT_PUBLIC_*`.
5. Параметры RPC называются с префиксом `p_` (например `p_org`, `p_page`). Смотри сигнатуры в миграциях.

## Коды ошибок → текст

| Код | Текст для пользователя |
|---|---|
| not_authenticated | Войдите в аккаунт |
| forbidden | Недостаточно прав для этого действия |
| subscription_required | Чтобы создать компанию, нужна подписка Team |
| subscription_inactive | Подписка компании истекла — доступен только просмотр |
| already_member | Вы уже состоите в другой компании |
| already_member_here | Вы уже состоите в этой компании |
| not_member | Вы не состоите в компании |
| owner_cannot_leave | Владелец не может выйти из своей компании |
| invite_invalid | Ссылка-приглашение недействительна или истекла |
| no_free_seats | В компании закончились места. Обратитесь к владельцу |
| module_unavailable | Этот модуль недоступен |
| scope_required | Выберите, кому доступна страница |
| scope_invalid | Неверно выбран доступ |
| not_found | Не найдено |
| invalid_role | Эту роль назначить нельзя |
| unit_cycle | Нельзя вложить подразделение само в себя |
| page_unavailable | Страница недоступна или в архиве |
| task_conflict | Задачу уже изменили. Обновите карточку — ваш текст сохранён в форме |
| due_in_past | Дедлайн должен быть в будущем |
| self_assign_forbidden | При создании нельзя назначить ответственным себя |
| assignee_no_access | У этого человека нет доступа к странице |
| invalid_location | Не удалось определить местоположение |
| rate_limited | Слишком много действий подряд. Подождите минуту |
| 23505 (дубль) | Такое название уже есть |

## Компания и сотрудники
- Создать: `create_organization(p_name, p_slug, p_description, p_city, p_logo_url)` → id.
- Ссылка: `create_invite(p_org)` → token. Адрес: `/invite/<token>`.
- Предпросмотр без входа: `get_invite_preview(p_token)` → `{organization_id, name, slug, logo_url, is_valid}`.
- Вступить: `accept_invite(p_token)`. Выйти: `leave_organization()`.
- Роли: `set_member_role(p_org, p_user, p_role)` (`admin|manager|employee`), должность: `set_member_position(...)`.
- Моя компания: `memberships` где `user_id = текущий` (в пилоте одна).
- Кто «Нераспределённые»: сотрудники компании без строк в `unit_members`.

## Canvas и страницы
- Дерево: `units` (parent_id), люди: `unit_members`, руководитель: `units.head_user_id`.
- Все страницы компании видны в `pages` (метаданные). Доступ текущего пользователя: `page_access` (свои строки)
  или `rpc('can_access_page')`. Недоступные — серые с замком.
- Линии Scope: `page_scopes` (`kind`: organization | unit | user).
- Создать: `create_page(p_org, p_module, p_name, p_scopes, p_description, p_icon)`,
  `p_scopes` = `[{"kind":"organization"}]` или `[{"kind":"unit","unit_id":"..."}]` или `[{"kind":"user","user_id":"..."}]`.
- Изменить: `update_page`, `update_page_scope`, архив: `set_page_archived(p_page, true|false)`.

## Задачи
- Список: `tasks` где `page_id = ...` и `archived_at is null`. Архив: `archived_at is not null`.
- Создать: `create_task(p_page, p_title, p_description, p_due_at, p_priority, p_assignee, p_coassignees)`.
- Поля: `update_task(p_task, p_expected_version, ...)` — передавай `version` из загруженной задачи.
  На `task_conflict`: перезагрузи задачу, введённый текст оставь в форме.
- Назначения: `set_task_assignees(p_task, p_expected_version, p_assignee, p_coassignees)`.
- Статус (Kanban): `set_task_status(p_task, p_status)` — оптимистично двигай карточку, при ошибке возвращай назад.
- Комментарии: `add_task_comment`, `edit_task_comment`, `delete_task_comment`; список — `task_comments`.
- История: `task_events`. Кнопки «Изменить»: `rpc('can_edit_task')`, статус/комментарий: `rpc('can_work_task')`.
- Фильтр «Требуют переназначения»: `assignee_id is null`.

## Чат
- Отправка: `send_message(p_page, p_client_id, p_body, p_reply_to)`. `p_client_id = crypto.randomUUID()`
  создаётся ОДИН раз на сообщение и переиспользуется при повторе — так не будет дублей.
- История: `messages` по `page_id`, `order(created_at desc)`, по 50.
- Прочитано: `mark_chat_read(p_page)` при открытии и прокрутке вниз.
- Раздел «Сообщения»: `get_my_chats()` → чаты, последнее сообщение, `unread_count`.
- Realtime:
  ```ts
  supabase.channel(`chat:${pageId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `page_id=eq.${pageId}` }, onChange)
    .subscribe()
  ```
  Отписывайся при уходе со страницы. Тот же подход для `tasks` и `task_comments`.

## GPS-отметки
- `navigator.geolocation.getCurrentPosition` с `{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }`.
- `check_attendance(p_kind: 'check_in'|'check_out', p_lat, p_lng, p_accuracy_m: coords.accuracy)` →
  `{ result, unit_name, distance_m, radius_m }`.
- Тексты: accepted «Отмечено», out_of_range «Вы в N м от филиала, нужно не дальше R м»,
  low_accuracy «Слабый сигнал GPS. Подойдите к окну и повторите», no_point «Для вашего филиала не задана точка отметки»,
  already_checked_in «Приход уже отмечен», not_checked_in «Сначала отметьте приход».
- Точка филиала: Owner/Admin обновляют `units.lat/lng/radius_m` (кнопка «Взять текущие координаты»).
- Координаты берём только по нажатию кнопки, никакой фоновой слежки.

## Каталог
- `search_people(p_query, p_city, p_limit, p_offset)`, `search_organizations(...)`. Ввод с задержкой ~300 мс, по 20.

## Картинки
- Аватар: `storage.from('avatars').upload(`${userId}/${Date.now()}.webp`, file, { upsert: true })`,
  затем `getPublicUrl` → `profiles.avatar_url`.
- Логотип: бакет `logos`, путь `${organizationId}/...` → `organizations.logo_url`.
- До 2 МБ, jpeg/png/webp. Сжимай перед загрузкой.

## Типы
Генерируй типы базы командой `supabase gen types typescript --project-id msgsvyetosqzkkphcbkq > src/lib/supabase/database.types.ts`
и используй их в клиентах.
