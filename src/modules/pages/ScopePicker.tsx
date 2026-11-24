"use client";

import { useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import { Collapse } from "@/components/ui/Collapse";
import { buildTree, type UnitRow } from "@/modules/canvas/tree";
import type { ScopeSelection } from "./logic";
import type { ScopeOptions } from "./scopeOptions";

type Props = { options: ScopeOptions; value: ScopeSelection; onChange: (v: ScopeSelection) => void; error?: string | null };

const box = "h-5 w-5 shrink-0 accent-accent";

// «Кому доступна»: вся компания, подразделения (деревом) и/или отдельные сотрудники. Выбор обязателен.
export function ScopePicker({ options, value, onChange, error }: Props) {
  const p = t.pages;
  const [query, setQuery] = useState("");
  const tree = useMemo(() => buildTree(options.units, []), [options.units]);
  const allowedUnits = options.allowedUnitIds ? new Set(options.allowedUnitIds) : null;
  const allowedUsers = options.allowedUserIds ? new Set(options.allowedUserIds) : null;

  const toggle = (key: "units" | "users", id: string) => {
    const list = value[key].includes(id) ? value[key].filter((x) => x !== id) : [...value[key], id];
    onChange({ ...value, [key]: list });
  };

  // Подразделения деревом, с отступом по вложенности.
  const rows: { unit: UnitRow; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const u of tree.children.get(parent) ?? []) {
      rows.push({ unit: u, depth });
      walk(u.id, depth + 1);
    }
  };
  walk(null, 0);

  const q = query.trim().toLowerCase();
  const people = options.people
    .filter((m) => !allowedUsers || allowedUsers.has(m.user_id))
    .filter((m) => !q || `${m.first_name} ${m.last_name} ${m.username}`.toLowerCase().includes(q));

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-sm font-medium text-ink">{p.scope}</legend>
      <p className="-mt-2 text-sm text-ink">{p.scopeHint}</p>

      {options.allowOrganization ? (
        <label className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-neutral-300 px-4 text-base text-ink has-[:checked]:border-accent">
          <input
            type="checkbox"
            className={box}
            checked={value.organization}
            onChange={(e) => onChange({ ...value, organization: e.target.checked })}
          />
          {p.scopeOrganization}
        </label>
      ) : null}

      <Collapse open={!value.organization}>
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-ink">{p.scopeUnits}</h3>
            {rows.length === 0 ? <p className="text-sm text-ink">{p.scopeNoUnits}</p> : null}
            <ul className="flex max-h-64 flex-col overflow-y-auto rounded-xl border border-neutral-200">
              {rows.map(({ unit, depth }) => {
                const disabled = !!allowedUnits && !allowedUnits.has(unit.id);
                return (
                  <li key={unit.id}>
                    <label
                      className={`flex min-h-11 items-center gap-3 py-2 pr-3 text-base text-ink ${
                        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-neutral-50"
                      }`}
                      style={{ paddingLeft: 12 + depth * 20 }}
                    >
                      <input
                        type="checkbox"
                        className={box}
                        disabled={disabled}
                        checked={value.units.includes(unit.id)}
                        onChange={() => toggle("units", unit.id)}
                      />
                      <span className="truncate">{unit.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink">{p.scopePeople}</h3>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={p.scopePeopleSearch}
              aria-label={p.scopePeopleSearch}
              className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
            />
            <ul className="flex max-h-64 flex-col overflow-y-auto rounded-xl border border-neutral-200">
              {people.map((m) => {
                const name = `${m.first_name} ${m.last_name}`.trim();
                return (
                  <li key={m.user_id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-neutral-50">
                      <input
                        type="checkbox"
                        className={box}
                        checked={value.users.includes(m.user_id)}
                        onChange={() => toggle("users", m.user_id)}
                      />
                      <Avatar url={m.avatar_url} name={name} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate text-base text-ink">{name}</span>
                        {m.position ? <span className="block truncate text-sm text-ink">{m.position}</span> : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </Collapse>

      {error ? <p className="animate-fade-in text-sm text-red-700">{error}</p> : null}
    </fieldset>
  );
}

