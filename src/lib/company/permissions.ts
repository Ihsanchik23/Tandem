// Какие кнопки управления показывать (ТЗ, раздел 6). Это только интерфейс:
// права окончательно проверяют функции базы (set_member_role, remove_member и др.).
export type Role = "owner" | "admin" | "manager" | "employee";

const isManager = (r: Role | null | undefined): r is "owner" | "admin" => r === "owner" || r === "admin";

// Профиль компании, должности, приглашения — Owner и Admin.
export function canEditCompany(my: Role | null | undefined): boolean {
  return isManager(my);
}

export const canEditPosition = canEditCompany;
export const canManageInvites = canEditCompany;

// Менять роль и удалять: Owner — всех, кроме себя; Admin — только Manager и Employee.
// Себя никто не трогает, Owner неприкасаем.
export function canManageMember(my: Role | null | undefined, target: Role, isSelf: boolean): boolean {
  if (isSelf || target === "owner" || !isManager(my)) return false;
  return my === "owner" || target !== "admin";
}

// Роли, которые можно выбрать для сотрудника. Owner назначить нельзя.
export function roleOptions(my: Role | null | undefined): Role[] {
  if (my === "owner") return ["admin", "manager", "employee"];
  if (my === "admin") return ["manager", "employee"];
  return [];
}
