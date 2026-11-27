"use client";

import { useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { format, pluralRu, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { accessHolders } from "@/lib/company/access";
import { fullName } from "@/lib/company/people";
import { Avatar } from "@/components/profile/Avatar";
import { Collapse } from "@/components/ui/Collapse";
import { FormMessage } from "@/components/ui/FormMessage";
import { InfoTip } from "@/components/ui/InfoTip";
import { PageIcon } from "@/components/ui/PageIcon";
import { buildTree, unitPath, type Tree } from "@/modules/canvas/tree";
import { moduleAvailable, moduleDef, MODULES } from "@/modules/registry";
import { createPage, type NewPageData } from "./actions";
import { PAGE_LIMITS, toScopeLite, validatePage, type ModuleKey, type PageFieldErrors, type ScopeSelection } from "./logic";

export const NEW_PAGE_FORM_ID = "new-page-form";

/** С какого остатка символов показывать счётчик. */
const COUNTER_FROM = { name: 10, description: 100 } as const;

// Форма «Новая страница» в панели справа: модуль, название, описание, «Кому доступна».
// Кнопки «Создать» и «Отмена» — в закреплённом низу панели (NewPagePanel), кнопка связана с формой по id.
export function NewPageForm({
  data,
  initialUnit,
  initialScope,
  onPending,
  onCreated,
}: {
  data: NewPageData;
  initialUnit: string | null;
  initialScope: string | null;
  onPending: (pending: boolean) => void;
  onCreated: (pageId: string) => void;
}) {
  const p = t.pages;
  const { options, used } = data;
  const tree = useMemo(() => buildTree(options.units, options.unitMembers), [options.units, options.unitMembers]);

  const firstModule = MODULES.find((m) => moduleAvailable(m, used[m.key] ?? 0))?.key ?? MODULES[0]!.key;
  const [module, setModule] = useState<ModuleKey>(firstModule);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selection, setSelection] = useState<ScopeSelection>(() => initialSelection(data, initialUnit, initialScope));
  const [errors, setErrors] = useState<PageFieldErrors>({});
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [, start] = useTransition();

  const holders = useMemo(() => accessHolders(toScopeLite(selection), tree, options.people), [selection, tree, options.people]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validatePage({ name, description, selection });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    onPending(true);
    start(async () => {
      const res = await createPage({ organizationId: data.organizationId, module, name, description, selection });
      if (res.pageId) {
        onCreated(res.pageId);
        return;
      }
      onPending(false);
      setErrors(res.fieldErrors ?? {});
      setFormError(res.error && !res.fieldErrors ? res.error : null);
    });
  }

  const err = (k: keyof PageFieldErrors) => (errors[k] ? t.errors[errors[k]!] : null);
  const field =
    "w-full rounded-xl border border-transparent bg-surface px-4 text-base text-ink placeholder:text-muted transition-colors focus:border-line focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20";

  return (
    <form id={NEW_PAGE_FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-7 pb-2">
      {/* Модуль */}
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{p.moduleLabel}</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {MODULES.map((m) => {
            const count = used[m.key] ?? 0;
            const available = moduleAvailable(m, count);
            const checked = module === m.key;
            return (
              <label
                key={m.key}
                className={`relative flex flex-col gap-2 rounded-2xl border p-3.5 transition-[border-color,background-color,box-shadow] duration-150 ${
                  !available
                    ? "cursor-not-allowed border-line opacity-55"
                    : checked
                      ? "cursor-pointer border-accent bg-accent/[0.04] shadow-[0_0_0_1px_var(--color-accent)]"
                      : "cursor-pointer border-line hover:border-neutral-300 hover:bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="module"
                  value={m.key}
                  checked={checked}
                  disabled={!available}
                  onChange={() => setModule(m.key)}
                  className="sr-only"
                />
                <span className="flex items-center justify-between gap-2">
                  <PageIcon moduleKey={m.key} size={36} />
                  {m.status === "soon" ? (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">{p.moduleSoon}</span>
                  ) : null}
                </span>
                <span className="text-[15px] font-semibold text-ink">{m.name}</span>
                <span className="line-clamp-2 text-[12px] leading-snug text-muted">{m.description}</span>
                {m.limit !== null && m.status === "active" ? (
                  <span className={`text-[12px] font-medium ${available ? "text-muted" : "text-accent"}`}>
                    {available ? format(p.moduleCount, { n: count, max: m.limit }) : p.moduleLimit}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Название и описание */}
      <div className="flex flex-col gap-4">
        <Field label={p.name} htmlFor="new-page-name" error={err("name")} counter={counter(name, PAGE_LIMITS.name, COUNTER_FROM.name)}>
          <input
            id="new-page-name"
            value={name}
            maxLength={PAGE_LIMITS.name}
            required
            autoComplete="off"
            placeholder={moduleDef(module).namePlaceholder}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((x) => ({ ...x, name: undefined }));
            }}
            aria-invalid={!!errors.name}
            className={`h-12 ${field} ${errors.name ? "border-red-300 bg-red-50/40" : ""}`}
          />
        </Field>
        <Field
          label={p.description}
          htmlFor="new-page-description"
          error={err("description")}
          counter={counter(description, PAGE_LIMITS.description, COUNTER_FROM.description)}
        >
          <AutoGrowArea
            id="new-page-description"
            value={description}
            maxLength={PAGE_LIMITS.description}
            placeholder={p.descriptionPlaceholder}
            onChange={(v) => {
              setDescription(v);
              setErrors((x) => ({ ...x, description: undefined }));
            }}
            className={`py-3 ${field}`}
          />
        </Field>
      </div>

      {/* Кому доступна */}
      <ScopeSection
        data={data}
        tree={tree}
        value={selection}
        onChange={(v) => {
          setSelection(v);
          setErrors((x) => ({ ...x, scope: undefined }));
        }}
        error={err("scope")}
        total={holders.size}
      />

      {formError ? <FormMessage kind="error">{t.errors[formError]}</FormMessage> : null}
    </form>
  );
}

function initialSelection(data: NewPageData, unit: string | null, scope: string | null): ScopeSelection {
  const { options } = data;
  const allowed = (id: string) => options.units.some((u) => u.id === id) && (!options.allowedUnitIds || options.allowedUnitIds.includes(id));
  if (unit && allowed(unit)) return { organization: false, units: [unit], users: [] };
  if (scope === "organization" && options.allowOrganization) return { organization: true, units: [], users: [] };
  return { organization: options.allowOrganization, units: [], users: [] };
}

function counter(text: string, max: number, from: number): string | null {
  return max - text.length <= from ? format(t.pages.counter, { n: text.length, max }) : null;
}

function Field({
  label,
  htmlFor,
  error,
  counter,
  children,
}: {
  label: string;
  htmlFor: string;
  error: string | null;
  counter: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[14px] font-medium text-ink">
          {label}
        </label>
        {counter ? <span className="text-[12px] tabular-nums text-muted">{counter}</span> : null}
      </span>
      {children}
      {error ? <p className="animate-fade-in text-[13px] text-red-700">{error}</p> : null}
    </div>
  );
}

// Описание: поле небольшое и растёт по мере ввода (до ~8 строк).
function AutoGrowArea({
  value,
  onChange,
  className,
  ...rest
}: { value: string; onChange: (v: string) => void; className: string } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value" | "className">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);
  return <textarea ref={ref} rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={`block resize-none ${className}`} {...rest} />;
}

// ---------- «Кому доступна» ----------

function ScopeSection({
  data,
  tree,
  value,
  onChange,
  error,
  total,
}: {
  data: NewPageData;
  tree: Tree;
  value: ScopeSelection;
  onChange: (v: ScopeSelection) => void;
  error: string | null;
  total: number;
}) {
  const p = t.pages;
  const { options } = data;
  const [peopleOpen, setPeopleOpen] = useState(value.users.length > 0);
  const unitsMode = !value.organization;
  const toggle = (key: "units" | "users", id: string) =>
    onChange({ ...value, [key]: value[key].includes(id) ? value[key].filter((x) => x !== id) : [...value[key], id] });

  const peopleById = useMemo(() => new Map(options.people.map((m) => [m.user_id, m])), [options.people]);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2.5 flex items-center gap-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
        {p.scope}
        <InfoTip label={p.info}>{p.scopeHint}</InfoTip>
      </legend>

      {/* Вся компания / Выбрать подразделения. Менеджеру «вся компания» недоступна — сразу подразделения. */}
      {options.allowOrganization ? (
        <div role="radiogroup" aria-label={p.scope} className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
          {[
            { on: !unitsMode, label: p.scopeModeAll, pick: () => onChange({ ...value, organization: true }) },
            { on: unitsMode, label: p.scopeModeUnits, pick: () => onChange({ ...value, organization: false }) },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              role="radio"
              aria-checked={s.on}
              onClick={s.pick}
              className={`h-10 rounded-lg px-2 text-[14px] font-medium transition-[background-color,color,box-shadow] duration-150 ${
                s.on ? "bg-white text-ink shadow-[0_1px_3px_rgba(30,30,30,0.12)]" : "text-muted hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      <Collapse open={unitsMode}>
        <div className="flex flex-col gap-3 pt-1">
          {value.units.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {value.units.map((id) => {
                const label = tree.byId.get(id)?.name ?? "";
                return <Chip key={id} label={label} onRemove={() => toggle("units", id)} />;
              })}
            </ul>
          ) : null}
          <UnitTree tree={tree} selected={value.units} allowed={options.allowedUnitIds} onToggle={(id) => toggle("units", id)} />

          {/* Отдельные сотрудники — по умолчанию скрыты. */}
          {value.users.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {value.users.map((id) => {
                const m = peopleById.get(id);
                return m ? <Chip key={id} label={fullName(m)} avatar={m.avatar_url} onRemove={() => toggle("users", id)} /> : null;
              })}
            </ul>
          ) : null}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPeopleOpen((o) => !o)}
              aria-expanded={peopleOpen}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-1 text-[14px] font-medium text-accent hover:text-accent-hover"
            >
              {peopleOpen ? (
                p.scopeHidePeople
              ) : (
                <>
                  <span aria-hidden className="text-[18px] leading-none">+</span>
                  {p.scopeAddPeople}
                </>
              )}
            </button>
            <InfoTip label={p.info}>{p.scopePeopleHint}</InfoTip>
          </div>
          <Collapse open={peopleOpen}>
            <PeoplePick data={data} selected={value.users} onToggle={(id) => toggle("users", id)} />
          </Collapse>
        </div>
      </Collapse>

      {error ? <p className="animate-fade-in text-[13px] text-red-700">{error}</p> : null}
      <p className="rounded-xl bg-surface px-3.5 py-2.5 text-[14px] text-ink">
        {format(p.scopeTotal, { n: total, people: pluralRu(total, p.humanForms) })}
      </p>
    </fieldset>
  );
}

function Chip({ label, avatar, onRemove }: { label: string; avatar?: string | null; onRemove: () => void }) {
  return (
    <li className="inline-flex h-8 max-w-full animate-pop-in items-center gap-1.5 rounded-full bg-surface pl-3 pr-1 text-[13px] font-medium text-ink">
      {avatar !== undefined ? <Avatar url={avatar} name={label} size={22} /> : null}
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={format(t.pages.removeChip, { name: label })}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white hover:text-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </li>
  );
}

const search =
  "h-10 w-full rounded-full border-0 bg-surface pl-10 pr-4 text-base text-ink placeholder:text-muted focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/25 md:text-[14px]";

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={search} />
    </label>
  );
}

// Дерево подразделений: ветки раскрываются, верхний уровень раскрыт сразу. С поиском — плоский список с путём.
function UnitTree({
  tree,
  selected,
  allowed,
  onToggle,
}: {
  tree: Tree;
  selected: string[];
  allowed: string[] | null;
  onToggle: (id: string) => void;
}) {
  const p = t.pages;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set((tree.children.get(null) ?? []).map((u) => u.id)));
  const allowedSet = allowed ? new Set(allowed) : null;
  const q = query.trim().toLowerCase();

  if (tree.byId.size === 0) return <p className="text-[14px] text-muted">{p.scopeNoUnits}</p>;

  const row = (id: string, label: string, depth: number, hasChildren: boolean) => {
    const disabled = !!allowedSet && !allowedSet.has(id);
    const open = expanded.has(id);
    return (
      <li key={id}>
        <div className="flex min-h-11 items-center gap-1 rounded-lg pr-2 hover:bg-surface" style={{ paddingLeft: 4 + depth * 20 }}>
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:text-ink"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 transition-transform duration-150 ${open ? "rotate-90" : ""}`} aria-hidden>
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          ) : (
            <span className="w-8 shrink-0" aria-hidden />
          )}
          <label className={`flex min-w-0 flex-1 items-center gap-3 py-2 text-[15px] text-ink ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
            <input type="checkbox" className="h-[18px] w-[18px] shrink-0 accent-accent" disabled={disabled} checked={selected.includes(id)} onChange={() => onToggle(id)} />
            <span className="min-w-0 truncate">{label}</span>
          </label>
        </div>
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
    <div className="flex flex-col gap-2">
      {tree.byId.size > 6 ? <SearchBox value={query} onChange={setQuery} placeholder={p.scopeUnitsSearch} /> : null}
      {rows.length === 0 ? (
        <p className="px-1 text-[14px] text-muted">{p.scopeNoMatch}</p>
      ) : (
        <ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain">{rows}</ul>
      )}
    </div>
  );
}

function PeoplePick({ data, selected, onToggle }: { data: NewPageData; selected: string[]; onToggle: (id: string) => void }) {
  const p = t.pages;
  const { options } = data;
  const [query, setQuery] = useState("");
  const allowed = options.allowedUserIds ? new Set(options.allowedUserIds) : null;
  const q = query.trim().toLowerCase();
  const people = options.people
    .filter((m) => !allowed || allowed.has(m.user_id))
    .filter((m) => !q || `${m.first_name} ${m.last_name} ${m.username} ${m.position ?? ""}`.toLowerCase().includes(q));
  return (
    <div className="flex flex-col gap-2 pt-1">
      <SearchBox value={query} onChange={setQuery} placeholder={p.scopePeopleSearch} />
      {people.length === 0 ? (
        <p className="px-1 text-[14px] text-muted">{p.scopeNoMatch}</p>
      ) : (
        <ul className="flex max-h-64 flex-col overflow-y-auto overscroll-contain">
          {people.map((m) => {
            const name = fullName(m);
            return (
              <li key={m.user_id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface">
                  <input type="checkbox" className="h-[18px] w-[18px] shrink-0 accent-accent" checked={selected.includes(m.user_id)} onChange={() => onToggle(m.user_id)} />
                  <Avatar url={m.avatar_url} name={name} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] text-ink">{name}</span>
                    {m.position ? <span className="block truncate text-[12px] text-muted">{m.position}</span> : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
