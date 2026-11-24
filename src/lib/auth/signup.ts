// Чистые функции регистрации (без сервера), чтобы их можно было проверить тестами.

// При включённом подтверждении email Supabase для уже ПОДТВЕРЖДЁННОГО адреса
// возвращает из signUp пользователя без ошибки, но с пустым списком identities.
// Для зарегистрированного, но не подтверждённого адреса identities не пустой —
// Supabase просто отправляет письмо ещё раз.
export function isAlreadyRegistered(user: { identities?: unknown[] | null } | null | undefined): boolean {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

// Ссылка на форму входа или сброса пароля с подставленным email
// (и адресом возврата, например к приглашению).
export function prefillUrl(path: string, email: string, next: string | null): string {
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  if (next) params.set("next", next);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
