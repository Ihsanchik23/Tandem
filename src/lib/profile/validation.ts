// Проверка полей профиля. Одни и те же правила в форме (до отправки) и на сервере.
// Ограничения совпадают с базой: имя и фамилия до 60, город до 60, «о себе» до 300,
// username ^[a-z0-9_]{3,30}$.
import type { ErrorKey } from "../i18n/ru.ts";

export const LIMITS = { name: 60, city: 60, bio: 300, usernameMin: 3, usernameMax: 30 } as const;

export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

// Имя, которое база выдаёт при регистрации: user_ + 12 символов.
const AUTO_USERNAME_RE = /^user_[0-9a-f]{12}$/;

export function isAutoUsername(username: string): boolean {
  return AUTO_USERNAME_RE.test(username);
}

// Приводит ввод к допустимому виду: строчные буквы, без @ и пробелов по краям.
export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export type ProfileInput = {
  first_name: string;
  last_name: string;
  username: string;
  city: string;
  bio: string;
};

export type ProfileFieldErrors = Partial<Record<keyof ProfileInput, ErrorKey>>;

export function cleanProfileInput(raw: Partial<Record<keyof ProfileInput, unknown>>): ProfileInput {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    first_name: s(raw.first_name).trim(),
    last_name: s(raw.last_name).trim(),
    username: normalizeUsername(s(raw.username)),
    city: s(raw.city).trim(),
    bio: s(raw.bio).trim(),
  };
}

export function validateProfile(input: ProfileInput): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  if (!input.first_name) errors.first_name = "firstNameRequired";
  else if (input.first_name.length > LIMITS.name) errors.first_name = "nameTooLong";
  if (!input.last_name) errors.last_name = "lastNameRequired";
  else if (input.last_name.length > LIMITS.name) errors.last_name = "nameTooLong";
  if (!USERNAME_RE.test(input.username)) errors.username = "usernameFormat";
  if (input.city.length > LIMITS.city) errors.city = "cityTooLong";
  if (input.bio.length > LIMITS.bio) errors.bio = "bioTooLong";
  return errors;
}

// Ошибка базы при сохранении профиля → поле и текст.
export function profileDbError(error: { code?: string | null; message?: string | null }): {
  field?: keyof ProfileInput;
  key: ErrorKey;
} {
  if (error.code === "23505") return { field: "username", key: "usernameTaken" };
  if (error.code === "23514") {
    const m = error.message ?? "";
    if (m.includes("username")) return { field: "username", key: "usernameFormat" };
    if (m.includes("bio")) return { field: "bio", key: "bioTooLong" };
    if (m.includes("city")) return { field: "city", key: "cityTooLong" };
    return { key: "fixFields" };
  }
  return { key: "generic" };
}
