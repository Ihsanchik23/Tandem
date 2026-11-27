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
import { Collapse } from "@/components/ui/Collapse";
import { FormMessage } from "@/components/ui/FormMessage";
import { IconButton, XIcon } from "@/components/ui/IconButton";
import { branchColors, buildTree, unitPath, type UnitRow } from "@/modules/canvas/tree";
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
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const tree = useMemo(() => buildTree(options.units, options.unitMembers), [options.units, options.unitMembers]);
  const colors = useMemo(() => branchColors(tree), [tree]);
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

  const unitChips = value.units.filter((id) => tree.byId.has(id)).map((id) => ({ id, label: unitPath(tree, id, " · "), color: colors.get(id)?.color ?? null }));

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">{p.accessTitle}</h2>
        <p className="text-[14px] text-muted">{p.accessHint}</p>
      </div>

      {saved && !changed ? <FormMessage kind="notice">{p.accessSaved}</FormMessage> : null}

      {/* Через структуру: подразделения или вся компания. */}
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
        <div className="flex items-center gap-2">
          <StructureIcon />
          <h3 className="flex-1 text-[15px] font-semibold text-ink">{p.viaStructure}</h3>
          <button
            type="button"
            onClick={() => setEditUnits((o) => !o)}
            aria-expanded={editUnits}
            className="h-8 rounded-full bg-white px-3 text-[13px] font-medium text-ink shadow-[0_1px_2px_rgba(30,30,30,0.08)] hover:bg-neutral-50"
          >
            {editUnits ? p.doneStructure : p.changeStructure}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {value.organization ? (
            <Chip label={p.scopeOrganization} color={null} strong />
          ) : unitChips.length > 0 ? (
            unitChips.map((u) => <Chip key={u.id} label={u.label} color={u.color} />)
          ) : (
            <span className="text-[14px] text-muted">{p.viaNothing}</span>
          )}
        </div>
        {value.organization || unitChips.length > 0 ? (
          <p className="text-[13px] text-muted">
            {format(p.peopleCount, { n: viaStructure, people: pluralRu(viaStructure, p.peopleForms) })} · {p.viaStructureHint}
          </p>
        ) : null}
        <Link href="/work/structure" className="w-fit text-[13px] font-medium text-ink underline underline-offset-4 hover:text-accent">
          {p.openStructure}
        </Link>
        <Collapse open={editUnits}>
          <UnitsEditor options={options} tree={tree} value={value} onChange={update} />
        </Collapse>
      </div>

      {/* Индивидуальный доступ. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <PersonIcon />
          <h3 className="flex-1 text-[15px] font-semibold text-ink">{p.individualTitle}</h3>
        </div>
        <p className="text-[13px] text-muted">{value.organization ? p.individualOrg : p.individualHint}</p>
        {!value.organization ? (
          <>
            {value.users.length === 0 ? <p className="py-1 text-[14px] text-muted">{p.individualNone}</p> : null}
            <ul className="flex flex-col">
              {value.users.map((id) => {
                const m = byId.get(id);
                const name = m ? fullName(m) : "—";
                return (
                  <li key={id} className="flex min-h-14 items-center gap-3 py-1.5">
                    <Avatar url={m?.avatar_url} name={name} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">{name}</span>
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
                className="flex h-10 w-fit items-center gap-2 rounded-full pl-1 pr-3 text-[14px] font-medium text-ink transition-colors hover:bg-surface"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface">
                  <PlusSmall />
                </span>
                {p.addPeople}
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {empty ? <FormMessage kind="error">{t.errors.scopeRequired}</FormMessage> : null}
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}

      {/* Сохранение: сначала показываем, кто получит и кто потеряет доступ. */}
      <Collapse open={changed && !confirming}>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line p-3 pl-4">
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
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-[0_8px_24px_-12px_rgba(30,30,30,0.2)]">
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
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-white px-3 text-[14px] font-medium text-ink">
          <input type="checkbox" className="h-5 w-5 accent-accent" checked={value.organization} onChange={(e) => onChange({ ...value, organization: e.target.checked })} />
          {p.scopeOrganization}
        </label>
      ) : null}
      <Collapse open={!value.organization}>
        {rows.length === 0 ? <p className="px-1 text-[14px] text-muted">{p.scopeNoUnits}</p> : null}
        <ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain rounded-xl bg-white p-1">
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
    <div className="mt-1 flex flex-col gap-2 rounded-2xl bg-surface p-3">
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

function Chip({ label, color, strong = false }: { label: string; color: number | null; strong?: boolean }) {
  const bg = color ? `var(--branch-${color}-bg)` : "#ffffff";
  const dot = color ? `var(--branch-${color}-strong)` : "#1e1e1e";
  return (
    <span className={`inline-flex h-7 max-w-full items-center gap-2 rounded-full pl-2.5 pr-3 text-[13px] text-ink ${strong ? "font-semibold" : "font-medium"}`} style={{ background: bg }}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

function Svg({ children, className = "h-[17px] w-[17px] text-muted" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {children}
    </svg>
  );
}
const StructureIcon = () => (
  <Svg>
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
    <path d="M6.5 10v4a2 2 0 0 0 2 2H14" />
  </Svg>
);
const PersonIcon = () => (
  <Svg>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
);
const PlusSmall = () => (
  <Svg className="h-4 w-4 text-ink">
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
