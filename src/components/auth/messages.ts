import { t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";

const ERROR_KEYS = Object.keys(t.errors) as ErrorKey[];

// Текст ошибки по ключу из адреса (?error=...). Неизвестный ключ — общий текст.
export function errorFromParam(value: string | null): string | null {
  if (!value) return null;
  return (ERROR_KEYS as string[]).includes(value) ? t.errors[value as ErrorKey] : t.errors.generic;
}
