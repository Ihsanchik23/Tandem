// Текст подтверждения удаления ветки. Чистая функция — проверяется тестами.
import { ru as t } from "../../lib/i18n/ru.ts";
import { format, pluralRu } from "../../lib/i18n/format.ts";

export type BranchSummary = {
  units: number; // подразделение вместе с вложенными
  members: number; // разные люди в ветке
  unassigned: number; // попадут в «Нераспределённые»
  pages: number; // страницы, связанные с веткой
  toArchive: number; // уйдут в архив
};

// Пусто — можно удалять без вопроса.
export function isEmptyBranch(s: BranchSummary): boolean {
  return s.members === 0 && s.pages === 0;
}

// Строки подтверждения — только ненулевые.
export function confirmLines(s: BranchSummary): string[] {
  const c = t.canvas;
  const lines: string[] = [];
  if (s.units > 1) lines.push(format(c.removeUnits, { n: s.units, units: pluralRu(s.units, c.unitForms) }));
  if (s.unassigned > 0)
    lines.push(format(c.removeUnassigned, { n: s.unassigned, people: pluralRu(s.unassigned, c.removePeopleForms) }));
  if (s.toArchive > 0)
    lines.push(format(c.removePages, { n: s.toArchive, pages: pluralRu(s.toArchive, c.removePagesForms) }));
  return lines;
}
