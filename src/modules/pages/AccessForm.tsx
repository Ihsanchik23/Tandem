"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { format, pluralRu, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import type { Member } from "@/lib/company/queries";
import { accessDiff, accessHolders, type ScopeLite } from "@/lib/company/access";
import { fullName } from "@/lib/company/people";
import { Avatar } from "@/components/profile/Avatar";
import { btnPrimary, btnSecondary } from "@/components/ui/Card";
import { Plus } from "@phosphor-icons/react";
import { Collapse } from "@/components/ui/Collapse";
import { Group, Row } from "@/components/ui/Grouped";
import { FormMessage } from "@/components/ui/FormMessage";
import { IconButton, XIcon } from "@/components/ui/IconButton";
import { buildTree, unitPath, type UnitRow } from "@/modules/canvas/tree";
import { updatePageScope } from "./actions";
import { isEmptySelection, toScopeLite, type ScopeSelection } from "./logic";
import type { ScopeOptions } from "./scopeOptions";

type Props = { pageId: string; options: ScopeOptions; initial: ScopeSelection };

const toLite = (sel: ScopeSelection): ScopeLite[] => toScopeLite(sel);
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

// «Доступ» в настройках страницы: через структуру (подразделения или вся компания) и индивидуальный.
// Изменения копятся и сохраняются одной кнопкой; перед сохранением видно, кто получит доступ, а кто его потеряет
// (ТЗ: изменение Scope применяется ко всему содержимому и требует подтверждения). Права проверяет база.
export function AccessForm({ pageId, options, initial }: Props) {
  const p = t.pages;
  const [value, setValue] = useState(initial);
  const [editUnits, setEditUnits] = useState(false);
  const [editPeople, setEditPeople] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const tree = useMemo(() => buildTree(options.units, options.unitMembers), [options.units, options.unitMembers]);
  const byId = useMemo(() => new Map(options.people.map((m) => [m.user_id, m])), [options.people]);

  const changed = value.organization !== initial.organization || !same(value.units, initial.units) || !same(value.users, initial.users);
  const empty = isEmptySelection(value);
  const diff = useMemo(() => accessDiff(toLite(initial), toLite(value), tree, options.people), [initial, value, tree, options.people]);
  // Кто видит страницу через структуру (без индивидуального доступа и без Owner/Admin — они видят всё и так).
  const viaStructure = useMemo(() => {
    const holders = accessHolders(toLite({ ...value, users: [] }), tree, options.people);
    return options.people.filter((m) => holders.has(m.user_id) && m.role !== "owner" && m.role !== "admin").length;
  }, [value, tree, options.people]);

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

  const unitNames = value.units.filter((id) => tree.byId.has(id)).map((id) => unitPath(tree, id, " · "));
  const structureValue = value.organization ? p.scopeOrganization : unitNames.length > 0 ? unitNames.join(", ") : p.viaNothing;
  const total = useMemo(() => accessHolders(toLite(value), tree, options.people).size, [value, tree, options.people]);

  return (
    <section className="flex flex-col gap-2">
      <Group
        title={p.accessTitle}
        info={
          <>
            {p.accessHint} {p.viaStructureHint}
          </>
        }
        infoLabel={p.info}
      >
        <Row
          label={p.viaStructure}
          sub={value.organization || unitNames.length > 0 ? format(p.peopleCount, { n: viaStructure, people: pluralRu(viaStructure, p.peopleForms) }) : undefined}
          value={structureValue}
          chevron
          expanded={editUnits}
          onClick={() => setEditUnits((o) => !o)}
        />
        <Row
          label={p.scopePeople}
          value={value.organization ? "—" : String(value.users.length)}
          chevron
          expanded={editPeople}
          onClick={() => setEditPeople((o) => !o)}
        />
        <Row label={format(p.scopeTotal, { n: total, people: pluralRu(total, p.humanForms) })} />
      </Group>

      {saved && !changed ? <p className="px-3.5 text-[14px] text-muted">{p.accessSaved}</p> : null}

      {/* Изменить подразделения (или «вся компания»). */}
      <Collapse open={editUnits}>
        <div className="flex flex-col gap-2 rounded-xl bg-white p-2">
          <UnitsEditor options={options} tree={tree} value={value} onChange={update} />
          <Link href="/work/structure" className="w-fit px-2 pb-1 text-[13px] font-medium text-ink underline underline-offset-4 hover:text-accent">
            {p.openStructure}
          </Link>
        </div>
      </Collapse>

      {/* Отдельные сотрудники. */}
      <Collapse open={editPeople}>
        <div className="flex flex-col gap-1 rounded-xl bg-white p-2">
          {value.organization ? <p className="px-2 py-2 text-[14px] text-muted">{p.individualOrg}</p> : null}
          {!value.organization ? (
            <>
              {value.users.length === 0 ? <p className="px-2 py-2 text-[14px] text-muted">{p.individualNone}</p> : null}
              <ul className="flex flex-col">
                {value.users.map((id) => {
                  const m = byId.get(id);
                  const name = m ? fullName(m) : "—";
                  return (
                    <li key={id} className="flex min-h-14 items-center gap-3 px-2 py-1.5">
                      <Avatar url={m?.avatar_url} name={name} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] text-ink">{name}</span>
                        {m && (m.role === "owner" || m.role === "admin") ? (
                          <span className="block truncate text-[12px] text-muted">{p.seesAllByRole}</span>
                        ) : m?.position ? (
                          <span className="block truncate text-[12px] text-muted">{m.position}</span>
                        ) : null}
                      </span>
                      <IconButton label={`${p.removePerson}: ${name}`} tip="end" tone="danger" onClick={() => update({ ...value, users: value.users.filter((x) => x !== id) })}>
                        <XIcon />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
              <Collapse open={adding}>
                {adding ? (
                  <PeopleAdder
                    people={options.people.filter(
                      (m) => !value.users.includes(m.user_id) && (!options.allowedUserIds || options.allowedUserIds.includes(m.user_id)),
                    )}
                    onAdd={(ids) => {
                      update({ ...value, users: [...value.users, ...ids] });
                      setAdding(false);
                    }}
                    onCancel={() => setAdding(false)}
                  />
                ) : null}
              </Collapse>
              {!adding ? (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex h-10 w-fit items-center gap-1.5 rounded-full px-2 text-[14px] font-medium text-accent transition-colors hover:text-accent-hover"
                >
                  <Plus size={16} weight="bold" />
                  {p.addPeople}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </Collapse>

      {empty ? <FormMessage kind="error">{t.errors.scopeRequired}</FormMessage> : null}
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}

      {/* Сохранение: сначала показываем, кто получит и кто потеряет доступ. */}
      <Collapse open={changed && !confirming}>
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 pl-4">
          <span className="min-w-0 flex-1 text-[14px] text-ink">{p.unsaved}</span>
          <button type="button" onClick={() => update(initial)} className={`${btnSecondary} h-10!`}>
            {p.reset}
          </button>
          <button type="button" disabled={empty} onClick={() => setConfirming(true)} className={`${btnPrimary} h-10!`}>
            {p.saveAccess}
          </button>
        </div>
      </Collapse>
      <Collapse open={changed && confirming}>
        <div className="flex flex-col gap-4 rounded-xl bg-white p-4">
          {diff.gain.length === 0 && diff.lose.length === 0 ? <p className="text-[14px] text-ink">{p.diffNone}</p> : null}
          {diff.gain.length > 0 ? <DiffList title={format(p.diffGain, { n: diff.gain.length })} ids={diff.gain} byId={byId} tone="gain" /> : null}
          {diff.lose.length > 0 ? <DiffList title={format(p.diffLose, { n: diff.lose.length })} ids={diff.lose} byId={byId} tone="lose" /> : null}
          <p className="text-[13px] text-muted">{p.diffConfirm}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={save} className={btnPrimary}>
              {pending ? p.saving : p.scopeConfirmYes}
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirming(false)} className={btnSecondary}>
              {p.cancel}
            </button>
          </div>
        </div>
      </Collapse>
    </section>
  );
}

// Вся компания и подразделения деревом (Manager — только свои, без «Вся компания»).
function UnitsEditor({ options, tree, value, onChange }: { options: ScopeOptions; tree: ReturnType<typeof buildTree>; value: ScopeSelection; onChange: (v: ScopeSelection) => void }) {
  const p = t.pages;
  const allowed = options.allowedUnitIds ? new Set(options.allowedUnitIds) : null;
  const rows: { unit: UnitRow; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const u of tree.children.get(parent) ?? []) {
      rows.push({ unit: u, depth });
      walk(u.id, depth + 1);
    }
  };
  walk(null, 0);
  const toggle = (id: string) => onChange({ ...value, units: value.units.includes(id) ? value.units.filter((x) => x !== id) : [...value.units, id] });

  return (
    <div className="flex flex-col gap-2 pt-1">
      {options.allowOrganization ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[15px] font-medium text-ink hover:bg-surface">
          <input type="checkbox" className="h-5 w-5 accent-accent" checked={value.organization} onChange={(e) => onChange({ ...value, organization: e.target.checked })} />
          {p.scopeOrganization}
        </label>
      ) : null}
      <Collapse open={!value.organization}>
        {rows.length === 0 ? <p className="px-1 text-[14px] text-muted">{p.scopeNoUnits}</p> : null}
        <ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain">
          {rows.map(({ unit, depth }) => {
            const off = !!allowed && !allowed.has(unit.id);
            return (
              <li key={unit.id}>
                <label
                  className={`flex min-h-10 items-center gap-3 rounded-lg py-1.5 pr-3 text-[14px] text-ink ${off ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-surface"}`}
                  style={{ paddingLeft: 10 + depth * 18 }}
                >
                  <input type="checkbox" className="h-[18px] w-[18px] shrink-0 accent-accent" disabled={off} checked={value.units.includes(unit.id)} onChange={() => toggle(unit.id)} />
                  <span className="truncate">{unit.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </Collapse>
    </div>
  );
}

// Выбор нескольких людей сразу, с поиском.
function PeopleAdder({ people, onAdd, onCancel }: { people: Member[]; onAdd: (ids: string[]) => void; onCancel: () => void }) {
  const p = t.pages;
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const q = query.trim().toLowerCase();
  const shown = people.filter((m) => !q || `${m.first_name} ${m.last_name} ${m.username} ${m.position ?? ""}`.toLowerCase().includes(q));
  const toggle = (id: string) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  if (people.length === 0) {
    return (
      <div className="mt-1 flex items-center gap-2 rounded-2xl bg-surface p-3 pl-4">
        <p className="min-w-0 flex-1 text-[14px] text-muted">{p.addPeopleAllIn}</p>
        <IconButton label={p.cancel} tip="end" onClick={onCancel}>
          <XIcon />
        </IconButton>
      </div>
    );
  }
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-xl bg-surface p-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={p.scopePeopleSearch}
          aria-label={p.scopePeopleSearch}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
        />
        <IconButton label={p.cancel} tip="end" onClick={onCancel}>
          <XIcon />
        </IconButton>
      </div>
      <ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain rounded-xl bg-white p-1">
        {shown.length === 0 ? <li className="px-3 py-2.5 text-[14px] text-muted">{t.company.peopleEmpty}</li> : null}
        {shown.map((m) => {
          const name = fullName(m);
          return (
            <li key={m.user_id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-surface">
                <input type="checkbox" className="h-[18px] w-[18px] shrink-0 accent-accent" checked={picked.includes(m.user_id)} onChange={() => toggle(m.user_id)} />
                <Avatar url={m.avatar_url} name={name} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] text-ink">{name}</span>
                  {m.position ? <span className="block truncate text-[12px] text-muted">{m.position}</span> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <button type="button" disabled={picked.length === 0} onClick={() => onAdd(picked)} className={`${btnPrimary} h-10!`}>
        {format(p.addPeopleSubmit, { n: picked.length })}
      </button>
    </div>
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
