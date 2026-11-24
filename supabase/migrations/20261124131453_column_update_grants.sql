-- Tandem · права на изменение столбцов.
-- Прямо (через API) менять можно только перечисленные столбцы. Кто может менять строку,
-- по-прежнему решают RLS-политики. Функции security definer и триггер updated_at работают
-- от владельца и не затрагиваются. Новые столбцы по умолчанию напрямую не меняются.

revoke update on public.organizations from authenticated, anon;
grant update (name, city, description, logo_url) on public.organizations to authenticated;

revoke update on public.profiles from authenticated, anon;
grant update (username, first_name, last_name, avatar_url, bio, city) on public.profiles to authenticated;
