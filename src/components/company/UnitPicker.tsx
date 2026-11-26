"use client";

import { useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import { branchColors, unitPath, type Tree, type UnitRow } from "@/modules/canvas/tree";

type Props = {
  tree: Tree;
  disabled?: Set<string>; // где человек уже состоит — видно, но выбрать нельзя
  onPick: (unitId: string) => void;
  autoFocus?: boolean;
};

// Выбор подразделения: дерево с отступами и цветом направления; при поиске — плоский список с путём.
export function UnitPicker({ tree, disabled, onPick, autoFocus = false }: Props) {
  const [query, setQuery] = useState("");
  const c = t.company;
  const colors = useMemo(() => branchColors(tree), [tree]);

  const rows = useMemo(() => {
    const list: { unit: UnitRow; depth: number; path: string }[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const u of tree.children.get(parent) ?? []) {
        list.push({ unit: u, depth, path: unitPath(tree, u.id, " · ") });
        walk(u.id, depth + 1);
      }
    };
    walk(null, 0);
    return list;
  }, [tree]);

  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.path.toLowerCase().includes(q)) : rows;

  if (rows.length === 0) return <p className="px-1 py-2 text-[14px] text-muted">{c.unitPickerEmpty}</p>;

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={c.unitPickerSearch}
        aria-label={c.unitPickerSearch}
        className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
      />
      <ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain rounded-xl border border-line p-1" role="listbox" aria-label={c.unitPickerSearch}>
        {shown.length === 0 ? <li className="px-3 py-2.5 text-[14px] text-muted">{c.unitPickerNothing}</li> : null}
        {shown.map(({ unit, depth, path }) => {
          const off = disabled?.has(unit.id) ?? false;
          const color = colors.get(unit.id)?.color;
          return (
            <li key={unit.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                disabled={off}
                onClick={() => onPick(unit.id)}
                className="flex min-h-10 w-full items-center gap-2.5 rounded-lg py-2 pr-3 text-left text-[14px] text-ink transition-colors enabled:hover:bg-surface disabled:cursor-default disabled:text-muted"
                style={{ paddingLeft: 12 + (q ? 0 : depth * 16) }}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color ? `var(--branch-${color}-strong)` : "#a3a3a3" }} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{q ? path : unit.name}</span>
                {off ? <span className="shrink-0 text-[12px] text-muted">{c.unitPickerHere}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
