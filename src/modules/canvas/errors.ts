// Ошибки базы при работе со структурой → понятный текст.
import type { ErrorKey } from "../../lib/i18n/ru.ts";
import { companyDbError } from "../../lib/company/validation.ts";

export const UNIT_LIMITS = { name: 100, address: 200 } as const;

type DbError = { code?: string | null; message?: string | null; details?: string | null };

export function unitDbError(error: DbError): ErrorKey {
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  if (error.code === "23505") return "unitNameTaken";
  if (error.code === "23503") {
    // Вложенные подразделения ссылаются на удаляемое через этот ключ.
    return text.includes("units_organization_id_parent_id_fkey") ? "unitHasChildren" : "unitInUse";
  }
  if (error.code === "23514") {
    if (text.includes("address")) return "unitAddressTooLong";
    if (text.includes("name")) return "unitNameTooLong";
    return "fixFields";
  }
  if (error.message === "unit_cycle") return "unitCycle";
  return companyDbError(error).key;
}

export function validateUnit(name: string, address: string): ErrorKey | null {
  if (!name.trim()) return "unitNameRequired";
  if (name.trim().length > UNIT_LIMITS.name) return "unitNameTooLong";
  if (address.trim().length > UNIT_LIMITS.address) return "unitAddressTooLong";
  return null;
}
