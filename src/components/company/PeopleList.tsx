"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import type { Member } from "@/lib/company/queries";
import { MemberRow } from "./MemberRow";

type Props = { members: Member[]; unassignedIds: string[] };

function matches(m: Member, q: string): boolean {
  if (!q) return true;
  const hay = `${m.first_name} ${m.last_name} ${m.username} ${m.position ?? ""}`.toLowerCase();
  return q.split(/\s+/).every((part) => hay.includes(part));
}

// Сотрудники компании с поиском по имени (в пилоте до ~100 человек — фильтруем на месте).
// Сверху блок «Нераспределённые»: люди без подразделения.
export function PeopleList({ members, unassignedIds }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase().replace(/^@/, "");
  const unassigned = new Set(unassignedIds);
  const found = members.filter((m) => matches(m, q));
  const free = found.filter((m) => unassigned.has(m.user_id));
  const c = t.company;

  return (
    <div className="flex flex-col gap-5">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={c.peopleSearch}
        aria-label={c.peopleSearch}
        className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
      />

      {found.length === 0 ? <p className="text-base text-ink">{c.peopleEmpty}</p> : null}

      {free.length > 0 ? (
        <section className="flex flex-col rounded-2xl border border-neutral-200 bg-white px-4 pt-3">
          <h2 className="text-base font-medium text-ink">
            {c.unassigned} · {free.length}
          </h2>
          <p className="text-sm text-ink">{c.unassignedHint}</p>
          <ul className="divide-y divide-neutral-100">
            {free.map((m) => (
              <MemberRow key={m.user_id} m={m} toCard />
            ))}
          </ul>
        </section>
      ) : null}

      {found.length > 0 ? (
        <section className="flex flex-col">
          <h2 className="text-sm font-medium text-ink">
            {c.allPeople} · {found.length}
          </h2>
          <ul className="divide-y divide-neutral-100">
            {found.map((m) => (
              <MemberRow key={m.user_id} m={m} toCard />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
