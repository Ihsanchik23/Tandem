// Проверка полей компании. Одни и те же правила в форме (до отправки) и на сервере.
// Ограничения совпадают с базой: название 1–100, город до 60, описание до 1000,
// адрес страницы (slug) ^[a-z0-9-]{3,40}$.
import type { ErrorKey } from "../i18n/ru.ts";

export const LIMITS = { name: 100, city: 60, description: 1000, slugMin: 3, slugMax: 40 } as const;

export const SLUG_RE = /^[a-z0-9-]{3,40}$/;

// Русские и казахские буквы → латиница (упрощённая схема, как в адресах сайтов).
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  ә: "a", ғ: "g", қ: "k", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
};

// «Магазин Береке» → «magazin-bereke». Пустая строка, если из названия ничего не вышло.
export function slugify(name: string): string {
  const latin = [...name.toLowerCase()].map((ch) => TRANSLIT[ch] ?? ch).join("");
  return latin
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.slugMax)
    .replace(/-+$/g, "");
}

// Ввод адреса вручную: строчные буквы, пробелы → дефис, без лишних символов.
export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, LIMITS.slugMax);
}

export type CompanyInput = { name: string; slug: string; city: string; description: string };
export type CompanyFieldErrors = Partial<Record<keyof CompanyInput, ErrorKey>>;

export function cleanCompanyInput(raw: Partial<Record<keyof CompanyInput, unknown>>): CompanyInput {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    name: s(raw.name).trim(),
    slug: normalizeSlug(s(raw.slug).trim()).replace(/^-+|-+$/g, ""),
    city: s(raw.city).trim(),
    description: s(raw.description).trim(),
  };
}

// withSlug: false — при редактировании адрес не меняется и не проверяется.
export function validateCompany(input: CompanyInput, { withSlug }: { withSlug: boolean }): CompanyFieldErrors {
  const errors: CompanyFieldErrors = {};
  if (!input.name) errors.name = "companyNameRequired";
  else if (input.name.length > LIMITS.name) errors.name = "companyNameTooLong";
  if (withSlug && !SLUG_RE.test(input.slug)) errors.slug = "slugFormat";
  if (input.city.length > LIMITS.city) errors.city = "cityTooLong";
  if (input.description.length > LIMITS.description) errors.description = "descriptionTooLong";
  return errors;
}

// Ошибка базы при создании или изменении компании → поле и текст.
export function companyDbError(error: { code?: string | null; message?: string | null }): {
  field?: keyof CompanyInput;
  key: ErrorKey;
} {
  const m = error.message ?? "";
  if (error.code === "23505") return { field: "slug", key: "slugTaken" };
  if (error.code === "23514") {
    if (m.includes("slug")) return { field: "slug", key: "slugFormat" };
    if (m.includes("name")) return { field: "name", key: "companyNameTooLong" };
    if (m.includes("city")) return { field: "city", key: "cityTooLong" };
    if (m.includes("description")) return { field: "description", key: "descriptionTooLong" };
    return { key: "fixFields" };
  }
  const byCode: Record<string, ErrorKey> = {
    subscription_required: "subscriptionRequired",
    subscription_inactive: "subscriptionInactive",
    already_member: "alreadyMember",
    forbidden: "forbidden",
    not_authenticated: "sessionExpired",
    rate_limited: "rateLimited",
  };
  return { key: byCode[m] ?? "generic" };
}
