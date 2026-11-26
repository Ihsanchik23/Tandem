"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Member } from "@/lib/company/queries";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Avatar } from "@/components/profile/Avatar";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { addUnitMembers, moveUnit, removeUnitMember, setUnitHead, updateUnit, type UnitResult } from "./actions";
import { DeleteBranch } from "./DeleteBranch";
import { PeoplePicker } from "./PeoplePicker";
import { moveTargets, unitPath, type Tree, type UnitRow } from "./tree";
import { UnitForm } from "./UnitForm";

type Props = {
  unit: UnitRow;
  tree: Tree;
  people: Map<string, Member>;
  organizationId: string;
  canEdit: boolean;
};

const selectCls =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base text-ink focus:border-accent focus:outline-none";

function personName(m: Member): string {
  return `${m.first_name} ${m.last_name}`.trim();
}

// Содержимое панели подразделения. Все видят сведения; Owner/Admin — ещё и действия.
// Кнопки — только интерфейс: изменения проверяет RLS.
export function UnitPanel({ unit, tree, people, organizationId, canEdit }: Props) {
  const c = t.canvas;
  const memberIds = tree.members.get(unit.id) ?? [];
  const members = memberIds.flatMap((id) => (people.get(id) ? [people.get(id)!] : []));
  const head = unit.head_user_id ? people.get(unit.head_user_id) ?? null : null;
  const childCount = tree.children.get(unit.id)?.length ?? 0;

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-2">
        {unit.address ? <p className="text-base text-ink">{unit.address}</p> : null}
        <h3 className="text-sm font-medium text-ink">{c.head}</h3>
        {head ? <PersonLine m={head} /> : <p className="text-base text-ink">{c.noHead}</p>}
        {childCount > 0 ? <p className="text-sm text-ink">{format(c.children, { n: childCount })}</p> : null}
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-ink">
          {c.people} · {members.length}
        </h3>
        {members.length === 0 ? <p className="text-base text-ink">{c.peopleEmpty}</p> : null}
        <ul className="divide-y divide-neutral-100">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-2 py-1">
              <div className="min-w-0 flex-1">
                <PersonLine m={m} />
              </div>
              {canEdit ? <RemovePerson unitId={unit.id} userId={m.user_id} /> : null}
            </li>
          ))}
        </ul>
      </section>

      {canEdit ? (
        <>
          <Section title={c.addPeople}>
            <PeoplePicker
              candidates={[...people.values()].filter((m) => !memberIds.includes(m.user_id))}
              onAdd={(ids) => addUnitMembers(organizationId, unit.id, ids)}
            />
          </Section>

          <Section title={c.head}>
            <HeadSelect unitId={unit.id} current={unit.head_user_id} people={[...people.values()]} />
          </Section>

          <Section title={c.edit}>
            <UnitForm
              key={unit.id}
              initial={{ name: unit.name, address: unit.address ?? "" }}
              submitLabel={c.save}
              pendingLabel={c.saving}
              onSubmit={(name, address) => updateUnit(unit.id, name, address)}
            />
          </Section>

          <Section title={c.move}>
            <MoveSelect unit={unit} tree={tree} />
          </Section>

          <DeleteBranch key={unit.id} unitId={unit.id} unitName={unit.name} />
        </>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-neutral-100 pt-5">
      <h3 className="text-base font-medium text-ink">{title}</h3>
      {children}
    </section>
  );
}

function PersonLine({ m }: { m: Member }) {
  const name = personName(m);
  return (
    <Link href={`/work/people?member=${m.user_id}`} className="flex items-center gap-3 py-1">
      <Avatar url={m.avatar_url} name={name} size={36} />
      <span className="min-w-0">
        <span className="block truncate text-base text-ink">{name}</span>
        {m.position ? <span className="block truncate text-sm text-ink">{m.position}</span> : null}
      </span>
    </Link>
  );
}

// Общая обвязка для быстрых действий: ожидание и ошибка.
function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<ErrorKey | null>(null);
  const [saved, setSaved] = useState(false);
  function run(fn: () => Promise<UnitResult>) {
    setSaved(false);
    start(async () => {
      const res = await fn();
      setError(res.error ?? null);
      setSaved(!res.error);
    });
  }
  return { pending, error, saved, run };
}

function RemovePerson({ unitId, userId }: { unitId: string; userId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => removeUnitMember(unitId, userId))}
        className="h-9 rounded-lg px-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {t.canvas.removePerson}
      </button>
      {error ? <span className="text-xs text-red-700">{t.errors[error]}</span> : null}
    </div>
  );
}

function HeadSelect({ unitId, current, people }: { unitId: string; current: string | null; people: Member[] }) {
  const c = t.canvas;
  const [value, setValue] = useState(current ?? "");
  const { pending, error, saved, run } = useAction();
  const sorted = [...people].sort((a, b) => personName(a).localeCompare(personName(b), "ru"));
  return (
    <div className="flex flex-col gap-3">
      <select aria-label={c.head} value={value} onChange={(e) => setValue(e.target.value)} className={selectCls}>
        <option value="">{c.headNone}</option>
        {sorted.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {personName(m)}
            {m.position ? ` — ${m.position}` : ""}
          </option>
        ))}
      </select>
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
      {saved ? <FormMessage kind="notice">{c.saved}</FormMessage> : null}
      <Button
        type="button"
        variant="secondary"
        disabled={value === (current ?? "")}
        pending={pending}
        pendingText={c.saving}
        onClick={() => run(() => setUnitHead(unitId, value || null))}
      >
        {c.save}
      </Button>
    </div>
  );
}

function MoveSelect({ unit, tree }: { unit: UnitRow; tree: Tree }) {
  const c = t.canvas;
  const [value, setValue] = useState(unit.parent_id ?? "");
  const { pending, error, saved, run } = useAction();
  const targets = moveTargets(tree, unit.id)
    .map((id) => ({ id: id ?? "", label: id ? unitPath(tree, id) : c.moveRoot }))
    .sort((a, b) => (a.id === "" ? -1 : b.id === "" ? 1 : a.label.localeCompare(b.label, "ru")));
  return (
    <div className="flex flex-col gap-3">
      <select aria-label={c.move} value={value} onChange={(e) => setValue(e.target.value)} className={selectCls}>
        {targets.map((o) => (
          <option key={o.id || "root"} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
      {saved ? <FormMessage kind="notice">{c.saved}</FormMessage> : null}
      <Button
        type="button"
        variant="secondary"
        disabled={value === (unit.parent_id ?? "")}
        pending={pending}
        pendingText={c.saving}
        onClick={() => run(() => moveUnit(unit.id, value || null))}
      >
        {c.moveSubmit}
      </Button>
    </div>
  );
}
