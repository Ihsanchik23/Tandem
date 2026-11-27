// Реестр модулей рабочих страниц — единственное место, где у модуля задаются иконка,
// название, описание, лимит и статус. Иконку страниц везде берём отсюда (components/ui/PageIcon).
// Новый модуль: добавить ключ в PAGE_MODULES (modules/pages/logic.ts) и запись здесь.
import type { Icon } from "@phosphor-icons/react";
import { ChatsCircle, ListChecks } from "@phosphor-icons/react/ssr";
import { t } from "@/lib/i18n";
import type { ModuleKey } from "@/modules/pages/logic";

export type ModuleStatus = "active" | "soon";

export type ModuleDef = {
  key: ModuleKey;
  /** Иконка Phosphor (стиль Regular, одноцветная). */
  Icon: Icon;
  name: string;
  /** Описание одной строкой — в форме создания страницы. */
  description: string;
  /** Подсказка в поле «Название». */
  namePlaceholder: string;
  /** Сколько страниц модуля можно создать по тарифу; null — без лимита. Сервер пока не проверяет. */
  limit: number | null;
  status: ModuleStatus;
};

const p = t.pages;

export const MODULES: readonly ModuleDef[] = [
  {
    key: "tasks",
    Icon: ListChecks,
    name: p.modules.tasks,
    description: p.moduleInfo.tasks,
    namePlaceholder: p.namePlaceholder.tasks,
    limit: null,
    status: "active",
  },
  {
    key: "chat",
    Icon: ChatsCircle,
    name: p.modules.chat,
    description: p.moduleInfo.chat,
    namePlaceholder: p.namePlaceholder.chat,
    limit: null,
    status: "active",
  },
];

export function moduleDef(key: string): ModuleDef {
  return MODULES.find((m) => m.key === key) ?? MODULES[0]!;
}

/** Модуль можно выбрать: не «Скоро» и лимит не исчерпан (used — сколько страниц уже есть). */
export function moduleAvailable(m: Pick<ModuleDef, "status" | "limit">, used: number): boolean {
  return m.status === "active" && (m.limit === null || used < m.limit);
}
