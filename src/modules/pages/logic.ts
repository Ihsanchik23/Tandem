// Рабочие страницы (ТЗ, раздел 11): чистые функции без сервера — покрыты тестами.
import type { ErrorKey } from "../../lib/i18n/ru.ts";
import { companyDbError } from "../../lib/company/validation.ts";

export const PAGE_LIMITS = { name: 100, description: 500 } as const;
export const PAGE_MODULES = ["tasks", "chat"] as const;
export type ModuleKey = (typeof PAGE_MODULES)[number];

// Как база хранит область доступа (page_scopes).
export type ScopeRow = { kind: "organization" | "unit" | "user"; unit_id: string | null; user_id: string | null };
// Как её выбирают в форме.
export type ScopeSelection = { organization: boolean; units: string[]; users: string[] };
export const EMPTY_SELECTION: ScopeSelection = { organization: false, units: [], users: [] };

// Выбор в форме → p_scopes для create_page / update_page_scope.
// «Вся компания» перекрывает всё остальное.
export function toScopes(sel: ScopeSelection): ({ kind: "organization" } | { kind: "unit"; unit_id: string } | { kind: "user"; user_id: string })[] {
  if (sel.organization) return [{ kind: "organization" }];
  return [
    ...[...new Set(sel.units)].map((unit_id) => ({ kind: "unit" as const, unit_id })),
    ...[...new Set(sel.users)].map((user_id) => ({ kind: "user" as const, user_id })),
  ];
}

export function fromScopes(rows: ScopeRow[]): ScopeSelection {
  return {
    organization: rows.some((r) => r.kind === "organization"),
    units: rows.flatMap((r) => (r.kind === "unit" && r.unit_id ? [r.unit_id] : [])),
    users: rows.flatMap((r) => (r.kind === "user" && r.user_id ? [r.user_id] : [])),
  };
}

export function isEmptySelection(sel: ScopeSelection): boolean {
  return !sel.organization && sel.units.length === 0 && sel.users.length === 0;
}

export type PageFieldErrors = Partial<Record<"name" | "description" | "scope", ErrorKey>>;

export function validatePage(input: { name: string; description: string; selection?: ScopeSelection }): PageFieldErrors {
  const errors: PageFieldErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = "pageNameRequired";
  else if (name.length > PAGE_LIMITS.name) errors.name = "pageNameTooLong";
  if (input.description.trim().length > PAGE_LIMITS.description) errors.description = "pageDescriptionTooLong";
  if (input.selection && isEmptySelection(input.selection)) errors.scope = "scopeRequired";
  return errors;
}

export function pageDbError(error: { code?: string | null; message?: string | null }): ErrorKey {
  const byCode: Record<string, ErrorKey> = {
    scope_required: "scopeRequired",
    scope_invalid: "scopeInvalid",
    module_unavailable: "moduleUnavailable",
    page_unavailable: "notFound",
  };
  const m = error.message ?? "";
  if (byCode[m]) return byCode[m];
  if (error.code === "23514") return m.includes("description") ? "pageDescriptionTooLong" : "pageNameTooLong";
  return companyDbError(error).key;
}

// «Новая» — пока страницу не открывали на этом устройстве, но только для страниц моложе 30 дней:
// иначе на новом телефоне все старые страницы стали бы «новыми».
const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export function isNewPage(page: { id: string; createdAt: string }, seen: ReadonlySet<string>, now = Date.now()): boolean {
  return !seen.has(page.id) && now - new Date(page.createdAt).getTime() < NEW_WINDOW_MS;
}

// Список: новые сверху, дальше — свежие раньше старых.
export function sortPages<T extends { id: string; createdAt: string }>(pages: T[], seen: ReadonlySet<string>, now = Date.now()): T[] {
  return [...pages].sort((a, b) => {
    const na = isNewPage(a, seen, now) ? 0 : 1;
    const nb = isNewPage(b, seen, now) ? 0 : 1;
    return na - nb || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function filterPages<T extends { name: string; moduleKey: string }>(pages: T[], query: string, module: ModuleKey | "all"): T[] {
  const q = query.trim().toLowerCase();
  return pages.filter((p) => (module === "all" || p.moduleKey === module) && (!q || p.name.toLowerCase().includes(q)));
}

// Кто может создавать и настраивать страницы (только для показа кнопок — права проверяет база).
export function canCreatePage(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}
export function canManagePage(role: string | null | undefined, createdBy: string | null, me: string): boolean {
  return role === "owner" || role === "admin" || (role === "manager" && createdBy === me);
}
