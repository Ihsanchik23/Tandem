"use client";

import { useState, useTransition } from "react";
import type { Member } from "@/lib/company/queries";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Avatar } from "@/components/profile/Avatar";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import type { UnitResult } from "./actions";

type Props = { candidates: Member[]; onAdd: (userIds: string[]) => Promise<UnitResult> };

// Добавить людей в подразделение: поиск и галочки. Один человек может быть в нескольких подразделениях.
export function PeoplePicker({ candidates, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();
  const c = t.canvas;

  if (candidates.length === 0) return <p className="text-sm text-neutral-500">{c.addPeopleAllIn}</p>;

  const q = query.trim().toLowerCase();
  const shown = candidates.filter((m) =>
    `${m.first_name} ${m.last_name} ${m.username} ${m.position ?? ""}`.toLowerCase().includes(q),
  );

  function toggle(id: string) {
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    start(async () => {
      const res = await onAdd([...picked]);
      setError(res.error ?? null);
      if (!res.error) {
        setPicked(new Set());
        setQuery("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={c.addPeopleSearch}
        aria-label={c.addPeopleSearch}
        className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
      />
      <ul className="flex max-h-72 flex-col overflow-y-auto rounded-xl border border-neutral-200">
        {shown.map((m) => {
          const name = `${m.first_name} ${m.last_name}`.trim();
          return (
            <li key={m.user_id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-neutral-50">
                <input
                  type="checkbox"
                  checked={picked.has(m.user_id)}
                  onChange={() => toggle(m.user_id)}
                  className="h-5 w-5 accent-accent"
                />
                <Avatar url={m.avatar_url} name={name} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-base text-ink">{name}</span>
                  {m.position ? <span className="block truncate text-sm text-neutral-500">{m.position}</span> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
      <Button type="button" onClick={submit} disabled={picked.size === 0} pending={pending} pendingText={c.saving}>
        {format(c.addPeopleSubmit, { n: picked.size })}
      </Button>
    </div>
  );
}
