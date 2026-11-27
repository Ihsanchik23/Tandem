"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, pluralRu, t } from "@/lib/i18n";
import { accessHolders } from "@/lib/company/access";
import { fullName } from "@/lib/company/people";
import { Avatar } from "@/components/profile/Avatar";
import { Collapse } from "@/components/ui/Collapse";
import { CheckRow, Row, Section } from "@/components/ui/Grouped";
import { Segmented } from "@/components/ui/Segmented";
import { unitPath, type Tree } from "@/modules/canvas/tree";
import { toScopeLite, type ScopeSelection } from "./logic";
import type { ScopeOptions } from "./scopeOptions";

// Группа «Доступ» — одна и та же при создании страницы и в её настройках:
// сегменты «Вся компания / Подразделения», строки «Подразделения» и «Отдельные сотрудники»
// (раскрываются на месте), итог «Доступ получат: N». Только выбор — сохраняет вызывающий экран, права проверяет база.
export function AccessPicker({
  options,
  tree,
  value,
  onChange,
  structureLink = false,
}: {
  options: ScopeOptions;
  tree: Tree;
  value: ScopeSelection;
  onChange: (v: ScopeSelection) => void;
  /** Ссылка «Открыть структуру» под списком подразделений (в настройках; в панели создания — нет, чтобы не потерять форму). */
  structureLink?: boolean;
}) {
  const p = t.pages;
  const [openUnits, setOpenUnits] = useState(false);
  const [openPeople, setOpenPeople] = useState(false);
  const unitsMode = !value.organization;
  const toggle = (key: "units" | "users", id: string) =>
    onChange({ ...value, [key]: value[key].includes(id) ? value[key].filter((x) => x !== id) : [...value[key], id] });

  const total = useMemo(() => accessHolders(toScopeLite(value), tree, options.people).size, [value, tree, options.people]);
  // Кто видит страницу через подразделения (без Owner/Admin — они видят всё и так).
  const viaUnits = useMemo(() => {
    const holders = accessHolders(toScopeLite({ ...value, organization: false, users: [] }), tree, options.people);
    return options.people.filter((m) => holders.has(m.user_id) && m.role !== "owner" && m.role !== "admin").length;
  }, [value, tree, options.people]);

  const unitNames = value.units.filter((id) => tree.byId.has(id)).map((id) => unitPath(tree, id, " · "));

  return (
    <Section
      title={p.accessTitle}
      info={
        <>
          {p.accessHint} {p.scopeHint} {p.scopePeopleHint}
        </>
      }
      infoLabel={p.info}
    >
      {/* Менеджеру «Вся компания» недоступна — сразу подразделения, без сегментов. */}
      {options.allowOrganization ? (
        <div className="px-2 py-2">
          <Segmented
            label={p.accessTitle}
            value={unitsMode ? "units" : "organization"}
            onChange={(v) => onChange({ ...value, organization: v === "organization" })}
            options={[
              { value: "organization", label: p.scopeOrganization },
              { value: "units", label: p.scopeUnits },
            ]}
          />
        </div>
      ) : null}

      {unitsMode ? (
        <>
          <Row
            label={p.scopeUnits}
            sub={unitNames.length > 0 ? format(p.peopleCount, { n: viaUnits, people: pluralRu(viaUnits, p.peopleForms) }) : undefined}
            value={unitNames.length > 0 ? unitNames.join(", ") : p.scopeUnitsNone}
            chevron
            expanded={openUnits}
            onClick={() => setOpenUnits((o) => !o)}
          />
          <Collapse open={openUnits}>
            <div className="flex flex-col gap-1 border-b-[0.5px] border-black/[0.09] px-1.5 pb-2 pt-1">
              <UnitTree tree={tree} selected={value.units} allowed={options.allowedUnitIds} onToggle={(id) => toggle("units", id)} />
              {structureLink ? (
                <Link href="/work/structure" className="w-fit px-2 py-1.5 text-[13px] font-medium text-accent hover:text-accent-hover">
                  {p.openStructure}
                </Link>
              ) : null}
            </div>
          </Collapse>
          <Row
            label={p.scopePeople}
            value={value.users.length > 0 ? String(value.users.length) : p.individualNone}
            chevron
            expanded={openPeople}
            onClick={() => setOpenPeople((o) => !o)}
          />
          <Collapse open={openPeople}>
            <div className="border-b-[0.5px] border-black/[0.09] px-1.5 pb-2 pt-1">
              <PeoplePick options={options} selected={value.users} onToggle={(id) => toggle("users", id)} />
            </div>
          </Collapse>
        </>
      ) : null}

      <Row label={<span className="font-medium">{format(p.scopeTotal, { n: total, people: pluralRu(total, p.humanForms) })}</span>} />
    </Section>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block px-1 pb-1">
      <span className="sr-only">{placeholder}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="pointer-events-none absolute left-4 top-[18px] h-4 w-4 -translate-y-1/2 text-muted" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-full border-0 bg-white pl-9 pr-4 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25 md:text-[14px]"
      />
    </label>
  );
}

// Дерево подразделений: ветки раскрываются, верхний уровень раскрыт сразу. С поиском — плоский список с путём.
function UnitTree({ tree, selected, allowed, onToggle }: { tree: Tree; selected: string[]; allowed: string[] | null; onToggle: (id: string) => void }) {
  const p = t.pages;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set((tree.children.get(null) ?? []).map((u) => u.id)));
  const allowedSet = allowed ? new Set(allowed) : null;
  const q = query.trim().toLowerCase();

  if (tree.byId.size === 0) return <p className="px-2 py-2 text-[14px] text-muted">{p.scopeNoUnits}</p>;

  const row = (id: string, label: string, depth: number, hasChildren: boolean) => {
    const open = expanded.has(id);
    return (
      <li key={id} className="flex items-center">
        <span style={{ width: depth * 20 }} className="shrink-0" aria-hidden />
        {hasChildren ? (
          <button
            type="button"
            onClick={() =>
              setExpanded((s) => {
                const next = new Set(s);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            aria-label={open ? p.scopeCollapse : p.scopeExpand}
            aria-expanded={open}
            className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 transition-transform duration-150 ${open ? "rotate-90" : ""}`} aria-hidden>
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        ) : (
          <span className="w-7 shrink-0" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <CheckRow checked={selected.includes(id)} disabled={!!allowedSet && !allowedSet.has(id)} onChange={() => onToggle(id)}>
            <span className="min-w-0 truncate">{label}</span>
          </CheckRow>
        </span>
      </li>
    );
  };

  const rows: React.ReactNode[] = [];
  if (q) {
    for (const u of tree.byId.values()) if (u.name.toLowerCase().includes(q)) rows.push(row(u.id, unitPath(tree, u.id), 0, false));
  } else {
    const walk = (parent: string | null, depth: number) => {
      for (const u of tree.children.get(parent) ?? []) {
        const kids = (tree.children.get(u.id) ?? []).length > 0;
        rows.push(row(u.id, u.name, depth, kids));
        if (kids && expanded.has(u.id)) walk(u.id, depth + 1);
      }
    };
    walk(null, 0);
  }

  return (
    <div className="flex flex-col">
      {tree.byId.size > 6 ? <SearchBox value={query} onChange={setQuery} placeholder={p.scopeUnitsSearch} /> : null}
      {rows.length === 0 ? (
        <p className="px-2 py-2 text-[14px] text-muted">{p.scopeNoMatch}</p>
      ) : (
        <ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain">{rows}</ul>
      )}
    </div>
  );
}

// Отдельные сотрудники: те, кого можно выбрать, и уже выбранные (их всегда можно убрать).
function PeoplePick({ options, selected, onToggle }: { options: ScopeOptions; selected: string[]; onToggle: (id: string) => void }) {
  const p = t.pages;
  const [query, setQuery] = useState("");
  const allowed = options.allowedUserIds ? new Set(options.allowedUserIds) : null;
  const q = query.trim().toLowerCase();
  const people = options.people
    .filter((m) => !allowed || allowed.has(m.user_id) || selected.includes(m.user_id))
    .filter((m) => !q || `${m.first_name} ${m.last_name} ${m.username} ${m.position ?? ""}`.toLowerCase().includes(q));
  return (
    <div className="flex flex-col">
      {options.people.length > 6 ? <SearchBox value={query} onChange={setQuery} placeholder={p.scopePeopleSearch} /> : null}
      {people.length === 0 ? (
        <p className="px-2 py-2 text-[14px] text-muted">{p.scopeNoMatch}</p>
      ) : (
        <ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain">
          {people.map((m) => {
            const name = fullName(m);
            const sub = m.role === "owner" || m.role === "admin" ? p.seesAllByRole : m.position;
            return (
              <li key={m.user_id}>
                <CheckRow checked={selected.includes(m.user_id)} onChange={() => onToggle(m.user_id)}>
                  <Avatar url={m.avatar_url} name={name} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] text-ink">{name}</span>
                    {sub ? <span className="block truncate text-[12px] text-muted">{sub}</span> : null}
                  </span>
                </CheckRow>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
