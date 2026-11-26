"use client";

import { useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import type { Member } from "@/lib/company/queries";
import { fullName, personMatches, unitChipsByUser, type UnitChip } from "@/lib/company/people";
import { Avatar } from "@/components/profile/Avatar";
import { buildTree, type UnitMemberRow, type UnitRow } from "@/modules/canvas/tree";

type Props = {
  members: Member[];
  units: UnitRow[];
  unitMembers: UnitMemberRow[];
  showUnassigned: boolean; // блок «Нераспределённые» — только Owner и Admin
  activeId?: string | null; // чья карточка открыта — строка подсвечена
  onOpen: (userId: string) => void;
};

// Сотрудники компании с поиском по имени, должности и подразделению (в пилоте до ~100 человек — фильтруем на месте).
// В строке видно, где человек состоит; сверху (для Owner/Admin) — «Нераспределённые».
export function PeopleList({ members, units, unitMembers, showUnassigned, activeId = null, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const chips = useMemo(() => unitChipsByUser(buildTree(units, unitMembers), unitMembers), [units, unitMembers]);
  const found = members.filter((m) => personMatches(m, chips.get(m.user_id) ?? [], query));
  const free = showUnassigned ? found.filter((m) => !chips.has(m.user_id)) : [];
  const c = t.company;

  const row = (m: Member) => (
    <PersonRow key={m.user_id} m={m} chips={chips.get(m.user_id) ?? []} active={activeId === m.user_id} onOpen={() => onOpen(m.user_id)} />
  );

  return (
    <div className="flex flex-col gap-5">
      <label className="relative block">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={c.peopleSearch}
          aria-label={c.peopleSearch}
          className="h-12 w-full rounded-2xl border border-line bg-white pl-11 pr-4 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
        />
      </label>

      {found.length === 0 ? <p className="text-base text-muted">{c.peopleEmpty}</p> : null}

      {free.length > 0 ? (
        <section className="flex flex-col rounded-2xl bg-surface px-2 pb-1 pt-3">
          <h2 className="px-2 text-[15px] font-semibold text-ink">
            {c.unassigned} · {free.length}
          </h2>
          <p className="px-2 text-[13px] text-muted">{c.unassignedHint}</p>
          <ul className="mt-1 flex flex-col">{free.map(row)}</ul>
        </section>
      ) : null}

      {found.length > 0 ? (
        <section className="flex flex-col">
          <h2 className="px-2 text-[13px] font-medium text-muted">
            {c.allPeople} · {found.length}
          </h2>
          <ul className="mt-1 flex flex-col">{found.map(row)}</ul>
        </section>
      ) : null}
    </div>
  );
}

// Строка: аватар, имя, должность и чипы подразделений. Нажатие открывает карточку сотрудника.
function PersonRow({ m, chips, active, onOpen }: { m: Member; chips: UnitChip[]; active: boolean; onOpen: () => void }) {
  const name = fullName(m);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className={`flex w-full items-start gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-accent ${
          active ? "bg-black/[0.04]" : ""
        }`}
      >
        <Avatar url={m.avatar_url} name={name} size={44} />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium text-ink">{name}</span>
            {m.position ? <span className="block truncate text-[13px] text-muted">{m.position}</span> : null}
          </span>
          <UnitChips chips={chips} />
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}
