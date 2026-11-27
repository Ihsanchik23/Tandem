"use client";

import { useMemo, useState, useTransition } from "react";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import type { Member } from "@/lib/company/queries";
import { accessDiff } from "@/lib/company/access";
import { fullName } from "@/lib/company/people";
import { Avatar } from "@/components/profile/Avatar";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { FormMessage } from "@/components/ui/FormMessage";
import { buildTree } from "@/modules/canvas/tree";
import { updatePageScope } from "./actions";
import { AccessPicker } from "./AccessPicker";
import { isEmptySelection, toScopeLite, type ScopeSelection } from "./logic";
import type { ScopeOptions } from "./scopeOptions";

type Props = { pageId: string; options: ScopeOptions; initial: ScopeSelection };

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

// «Доступ» в настройках страницы: тот же выбор, что при создании (AccessPicker).
// Изменения копятся и сохраняются одной кнопкой; перед сохранением видно, кто получит доступ, а кто его потеряет
// (ТЗ: изменение Scope применяется ко всему содержимому и требует подтверждения). Права проверяет база.
export function AccessForm({ pageId, options, initial }: Props) {
  const p = t.pages;
  const [value, setValue] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const tree = useMemo(() => buildTree(options.units, options.unitMembers), [options.units, options.unitMembers]);
  const byId = useMemo(() => new Map(options.people.map((m) => [m.user_id, m])), [options.people]);

  const changed = value.organization !== initial.organization || !same(value.units, initial.units) || !same(value.users, initial.users);
  const empty = isEmptySelection(value);
  const diff = useMemo(() => accessDiff(toScopeLite(initial), toScopeLite(value), tree, options.people), [initial, value, tree, options.people]);

  function update(next: ScopeSelection) {
    setValue(next);
    setSaved(false);
    setError(null);
    setConfirming(false);
  }

  function save() {
    start(async () => {
      const res = await updatePageScope(pageId, value);
      if (res.error) return setError(res.error);
      setConfirming(false);
      setSaved(true);
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <AccessPicker options={options} tree={tree} value={value} onChange={update} structureLink />

      {saved && !changed ? <p className="px-3.5 text-[14px] text-muted">{p.accessSaved}</p> : null}
      {empty ? <FormMessage kind="error">{t.errors.scopeRequired}</FormMessage> : null}
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}

      {/* Сохранение: сначала показываем, кто получит и кто потеряет доступ. */}
      <Collapse open={changed && !confirming}>
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface p-3 pl-4">
          <span className="min-w-0 flex-1 text-[14px] text-ink">{p.unsaved}</span>
          <SecondaryButton size="sm" onClick={() => update(initial)} className="bg-white! hover:bg-neutral-100!">
            {p.reset}
          </SecondaryButton>
          <PrimaryButton size="sm" disabled={empty} onClick={() => setConfirming(true)}>
            {p.saveAccess}
          </PrimaryButton>
        </div>
      </Collapse>
      <Collapse open={changed && confirming}>
        <div className="flex flex-col gap-4 rounded-xl bg-surface p-4">
          {diff.gain.length === 0 && diff.lose.length === 0 ? <p className="text-[14px] text-ink">{p.diffNone}</p> : null}
          {diff.gain.length > 0 ? <DiffList title={format(p.diffGain, { n: diff.gain.length })} ids={diff.gain} byId={byId} tone="gain" /> : null}
          {diff.lose.length > 0 ? <DiffList title={format(p.diffLose, { n: diff.lose.length })} ids={diff.lose} byId={byId} tone="lose" /> : null}
          <p className="text-[13px] text-muted">{p.diffConfirm}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton size="sm" disabled={pending} onClick={() => setConfirming(false)} className="bg-white! hover:bg-neutral-100!">
              {p.cancel}
            </SecondaryButton>
            <PrimaryButton size="sm" pending={pending} pendingText={p.saving} onClick={save}>
              {p.scopeConfirmYes}
            </PrimaryButton>
          </div>
        </div>
      </Collapse>
    </section>
  );
}

function DiffList({ title, ids, byId, tone }: { title: string; ids: string[]; byId: Map<string, Member>; tone: "gain" | "lose" }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={`text-[13px] font-semibold ${tone === "gain" ? "text-emerald-800" : "text-red-800"}`}>{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {ids.map((id) => {
          const m = byId.get(id);
          const name = m ? fullName(m) : "—";
          return (
            <li key={id} className={`inline-flex h-8 items-center gap-2 rounded-full pl-1 pr-3 text-[13px] text-ink ${tone === "gain" ? "bg-emerald-50" : "bg-red-50"}`}>
              <Avatar url={m?.avatar_url} name={name} size={24} />
              {name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
