"use client";

import { CaretDown, CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { t } from "@/lib/i18n";
import type { Member } from "@/lib/company/queries";
import { fullName, personMatches, unitChipsByUser, type UnitChip } from "@/lib/company/people";
import { Avatar } from "@/components/profile/Avatar";
import { Collapse } from "@/components/ui/Collapse";
import { Section } from "@/components/ui/Grouped";
import { buildTree, type UnitMemberRow, type UnitRow } from "@/modules/canvas/tree";

type Props = {
  members: Member[];
  units: UnitRow[];
  unitMembers: UnitMemberRow[];
  showUnassigned: boolean; // блок «Нераспределённые» — только Owner и Admin
  activeId?: string | null; // чья карточка открыта — строка подсвечена
  onOpen: (userId: string) => void;
};

// «Нераспределённые» свёрнуты или нет — запоминаем в браузере.
const COLLAPSED_KEY = "tandem.people.unassignedCollapsed";
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function setCollapsed(v: boolean) {
  localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
  listeners.forEach((l) => l());
}

// Сотрудники компании с поиском по имени, должности и подразделению (в пилоте до ~100 человек — фильтруем на месте).
// Группы со строками (docs/design.md); сверху (для Owner/Admin) — те же строки группой «Нераспределённые».
export function PeopleList({ members, units, unitMembers, showUnassigned, activeId = null, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const collapsed = useSyncExternalStore(subscribe, () => localStorage.getItem(COLLAPSED_KEY) === "1", () => false);
  const chips = useMemo(() => unitChipsByUser(buildTree(units, unitMembers), unitMembers), [units, unitMembers]);
  const found = members.filter((m) => personMatches(m, chips.get(m.user_id) ?? [], query));
  const free = showUnassigned ? found.filter((m) => !chips.has(m.user_id)) : [];
  const c = t.company;

  const row = (m: Member) => (
    <PersonRow key={m.user_id} m={m} chips={chips.get(m.user_id) ?? []} active={activeId === m.user_id} onOpen={() => onOpen(m.user_id)} />
  );

  return (
    <div className="flex flex-col gap-6">
      <label className="relative block">
        <span className="sr-only">{c.peopleSearch}</span>
        <MagnifyingGlass size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={c.peopleSearch}
          className="h-11 w-full rounded-full border-0 bg-surface pl-12 pr-4 text-base text-ink placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      {found.length === 0 ? <p className="px-3.5 text-base text-muted">{c.peopleEmpty}</p> : null}

      {free.length > 0 ? (
        <Section
          title={`${c.unassigned} · ${free.length}`}
          info={c.unassignedHint}
          infoLabel={t.pages.info}
          action={
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? c.groupExpand : c.groupCollapse}
              title={collapsed ? c.groupExpand : c.groupCollapse}
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5"
            >
              <CaretDown size={16} weight="bold" className={`transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
            </button>
          }
        >
          <Collapse open={!collapsed}>
            <ul>{free.map(row)}</ul>
          </Collapse>
        </Section>
      ) : null}

      {found.length > 0 ? (
        <Section title={`${c.allPeople} · ${found.length}`}>
          <ul>{found.map(row)}</ul>
        </Section>
      ) : null}
    </div>
  );
}

// Строка: аватар, имя, должность серым, чипы подразделений, шеврон. Разделитель — от текста.
function PersonRow({ m, chips, active, onOpen }: { m: Member; chips: UnitChip[]; active: boolean; onOpen: () => void }) {
  const name = fullName(m);
  return (
    <li className="group">
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className={`flex w-full items-center gap-3 pl-3.5 text-left transition-colors group-first:rounded-t-xl group-last:rounded-b-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
          active ? "bg-black/[0.06]" : "hover:bg-black/[0.03] active:bg-black/[0.06]"
        }`}
      >
        <Avatar url={m.avatar_url} name={name} size={40} />
        <span className="flex min-w-0 flex-1 items-center gap-2 border-b-[0.5px] border-black/[0.09] py-2.5 pr-3 group-last:border-b-0">
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="min-w-0">
              <span className="block truncate text-[15px] text-ink">{name}</span>
              {m.position ? <span className="block truncate text-[13px] text-muted">{m.position}</span> : null}
            </span>
            <UnitChips chips={chips} />
          </span>
          <CaretRight size={16} weight="bold" className="shrink-0 text-neutral-400" aria-hidden />
        </span>
      </button>
    </li>
  );
}

// Где человек состоит. Нигде — серый пунктирный чип «Не распределён».
export function UnitChips({ chips }: { chips: UnitChip[] }) {
  if (chips.length === 0) {
    return (
      <span className="flex">
        <span className="inline-flex h-6 items-center rounded-full border border-dashed border-neutral-300 px-2.5 text-[12px] text-muted">
          {t.company.notAssigned}
        </span>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <UnitChipView key={c.unitId} chip={c} />
      ))}
    </span>
  );
}

export function UnitChipView({ chip, children }: { chip: UnitChip; children?: React.ReactNode }) {
  const bg = chip.color ? `var(--branch-${chip.color}-bg)` : "var(--tandem-surface)";
  const dot = chip.color ? `var(--branch-${chip.color}-strong)` : "#a3a3a3";
  return (
    <span className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full pl-2 pr-2.5 text-[12px] font-medium text-ink" style={{ background: bg }}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />
      <span className="truncate">{chip.label}</span>
      {children}
    </span>
  );
}
