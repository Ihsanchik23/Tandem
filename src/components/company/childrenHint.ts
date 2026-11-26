// Подсказка при распределении: человек в подразделении с дочерними увидит и их рабочие страницы
// (страница подразделения доступна и всем родительским — ТЗ, раздел 11).
import { format, t } from "@/lib/i18n";
import type { Tree } from "@/modules/canvas/tree";

const SHOWN = 3;

// «Точка 1, Точка 2» или «Точка 1, Точка 2, Точка 3 и ещё 2»; null — дочерних нет.
export function childrenHint(tree: Tree, unitId: string, name: string): string | null {
  const kids = (tree.children.get(unitId) ?? []).map((u) => u.name);
  if (kids.length === 0) return null;
  const list = kids.slice(0, SHOWN).join(", ");
  const units = kids.length > SHOWN ? format(t.company.childrenMore, { list, n: kids.length - SHOWN }) : list;
  return format(t.company.childrenHint, { name, units });
}
