"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { Member } from "@/lib/company/queries";
import { format, pluralRu, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Avatar } from "@/components/profile/Avatar";
import { Collapse } from "@/components/ui/Collapse";
import { ChatPageIcon, ChevronDownIcon, LockIcon, PlusIcon, TasksPageIcon } from "@/components/nav/icons";

// Размеры карточек для раскладки (layout.ts). Высоты — с запасом, чтобы карточки не наезжали.
export const CARD_W = 240;
export const ROOT_H = 150;
export const UNIT_H = 200;
export const PERSON_H = 40;
export const PAGE_W = 200;
export const PAGE_H = 64;

// Цвет направления: переменные --branch-N-* из globals.css. null — без цвета (компания, страницы компании).
export type Tint = { color: number; nested: boolean } | null;
const v = (tint: Tint, key: "bg" | "soft" | "line" | "strong" | "text" | "chip", fallback: string) =>
  tint ? `var(--branch-${tint.color}-${key})` : fallback;
const cardBg = (tint: Tint) => v(tint, tint?.nested ? "soft" : "bg", "#f3f0ec");
// Обводка выделенной карточки — в цвете её ветки (компания — чёрная).
const SELECTED = "ring-[2.5px] ring-offset-2 ring-offset-white";
const ringColor = (tint: Tint) => ({ "--tw-ring-color": v(tint, "strong", "#1e1e1e") }) as React.CSSProperties;

export type CreateUnitResult = { error?: ErrorKey; id?: string };

// Меню у «+»: открыто ли и что делать. Состояние ведёт холст, чтобы открытая карточка была поверх соседних.
type AddMenu = {
  canEdit: boolean;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onCreateUnit: (name: string) => Promise<CreateUnitResult>;
  pageHref: string;
  highlight: boolean; // только что созданная карточка — короткая подсветка
};

export type RootData = AddMenu & {
  name: string;
  logoUrl: string | null;
  members: number; // сотрудников в компании
  branches: number; // подразделений первого уровня
};
export type UnitData = AddMenu & {
  name: string;
  tint: Tint;
  head: Member | null;
  direct: number;
  branch: number;
  people: Member[];
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
};
export type PageData = {
  name: string;
  moduleKey: string;
  tint: Tint;
  locked: boolean; // нет доступа — серая, с замком, не открывается
  extraPeople: number; // отдельные сотрудники в доступе — счётчик без линий
  highlight: boolean;
  onOpen: () => void;
};

export type RootNodeType = Node<RootData, "root">;
export type UnitNodeType = Node<UnitData, "unit">;
export type PageNodeType = Node<PageData, "page">;

// Невидимые точки крепления линий: сверху — от родителя, снизу — к детям и страницам.
function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} isConnectable={false} />
    </>
  );
}

const fullName = (m: Member) => `${m.first_name} ${m.last_name}`.trim() || `@${m.username}`;

// Аватар: фото, а без фото — инициалы на фоне цвета ветки.
function Face({ m, size, tint, ring }: { m: Member; size: number; tint: Tint; ring?: string }) {
  const name = fullName(m);
  const style = { width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined };
  if (m.avatar_url) {
    return (
      <span className="shrink-0 rounded-full" style={style}>
        <Avatar url={m.avatar_url} name={name} size={size} />
      </span>
    );
  }
  const initials = name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-ink"
      style={{ ...style, background: v(tint, "chip", "#e5e5e5"), fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function UnitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
      <path d="M6.5 10v4a2 2 0 0 0 2 2H14" />
    </svg>
  );
}

function PageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </svg>
  );
}

// «+» под карточкой. На компьютере меню появляется при наведении, на телефоне — по нажатию.
// «Подразделение» — сразу поле для названия здесь же; «Страница» — экран создания с подставленным доступом.
function AddButton({ data, tint, label, dark = false }: { data: AddMenu; tint: Tint; label: string; dark?: boolean }) {
  const c = t.canvas;
  const [mode, setMode] = useState<"menu" | "unit">("menu");
  const [name, setName] = useState("");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { menuOpen, onMenu } = data;

  // Меню закрылось — в следующий раз снова начинаем с выбора.
  const [wasOpen, setWasOpen] = useState(menuOpen);
  if (wasOpen !== menuOpen) {
    setWasOpen(menuOpen);
    if (!menuOpen) {
      setMode("menu");
      setName("");
      setError(null);
    }
  }
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  function hover(open: boolean) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (open) onMenu(true);
    // Уводим мышь — закрываем с небольшой задержкой (чтобы успеть дойти до меню), но не во время ввода названия.
    else if (mode === "menu") closeTimer.current = setTimeout(() => onMenu(false), 250);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("unitNameRequired");
    start(async () => {
      const res = await data.onCreateUnit(name);
      if (res.error) return setError(res.error);
      onMenu(false);
    });
  }

  const strong = dark ? "#1e1e1e" : v(tint, "strong", "#1e1e1e");
  return (
    <div
      className="nodrag nopan absolute -bottom-4 left-1/2 z-20 -translate-x-1/2"
      // Наведение — только мышью: на телефоне касание тоже шлёт «наведение», и меню мигнуло бы.
      onPointerEnter={(e) => e.pointerType === "mouse" && hover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && hover(false)}
    >
      <button
        type="button"
        onClick={() => onMenu(!menuOpen)}
        aria-label={label}
        aria-expanded={menuOpen}
        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-transform hover:scale-110 ${
          dark ? "border-2 border-ink bg-white text-ink" : "text-white"
        }`}
        style={dark ? undefined : { background: strong }}
      >
        <PlusIcon className={`h-4 w-4 transition-transform duration-200 ${menuOpen ? "rotate-45" : ""}`} />
      </button>

      {menuOpen ? (
        <div className="nowheel animate-fade-in absolute left-1/2 top-10 w-56 -translate-x-1/2 rounded-2xl bg-white p-1.5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
          {mode === "menu" ? (
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setMode("unit")}
                className="flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-ink hover:brightness-95"
                style={{ background: dark ? "#f3f0ec" : v(tint, "bg", "#f3f0ec") }}
              >
                <UnitIcon className="h-[18px] w-[18px]" />
                {c.menuUnit}
              </button>
              <Link href={data.pageHref} className="flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-ink hover:bg-neutral-100">
                <PageIcon className="h-[18px] w-[18px]" />
                {c.menuPage}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-2 p-1.5">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-ink">{c.newUnitLabel}</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && onMenu(false)}
                  maxLength={100}
                  placeholder={c.namePlaceholder}
                  className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
                />
              </label>
              {error ? <p className="text-xs text-red-700">{t.errors[error]}</p> : null}
              <button
                type="submit"
                disabled={pending}
                className="h-10 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                style={{ background: strong }}
              >
                {pending ? c.creating : c.create}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}

// Карточка компании: тёмная, логотип, название, сотрудники и филиалы.
export function RootNode({ data, selected }: NodeProps<RootNodeType>) {
  const c = t.canvas;
  const stats = [`${data.members} ${pluralRu(data.members, c.direct)}`, `${data.branches} ${pluralRu(data.branches, c.branchForms)}`];
  return (
    <div
      className={`relative flex flex-col items-center gap-2 rounded-3xl bg-ink px-5 pb-7 pt-5 text-center text-white shadow-[0_8px_24px_rgba(0,0,0,0.14)] ${data.highlight ? "animate-focus-pulse" : ""} ${
        selected ? SELECTED : ""
      }`}
      style={{ width: CARD_W, ...ringColor(null) }}
    >
      <span className="rounded-full bg-white p-0.5">
        <Avatar url={data.logoUrl} name={data.name} size={44} />
      </span>
      <p className="line-clamp-2 break-words text-base font-semibold">{data.name}</p>
      <p className="text-xs leading-5 text-white">{stats.join(" · ")}</p>
      {data.canEdit ? <AddButton data={data} tint={null} label={c.add} dark /> : null}
      <Handles />
    </div>
  );
}

// Карточка подразделения (вариант A): вся залита цветом своего направления.
// Нажатие на любую часть открывает панель; «›» справа и подъём при наведении подсказывают это.
export function UnitNode({ data, selected }: NodeProps<UnitNodeType>) {
  const c = t.canvas;
  const { tint } = data;
  const count = `${data.direct} ${pluralRu(data.direct, c.peopleForms)}`;
  const faces = data.people.slice(0, 3);
  const more = data.people.length - faces.length;

  return (
    <div className="group relative" style={{ width: CARD_W }}>
      <div
        className={`relative flex flex-col gap-3 rounded-3xl p-4 pb-6 transition-[transform,box-shadow] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_24px_rgba(0,0,0,0.12)] ${
          data.highlight ? "animate-focus-pulse" : ""
        } ${selected ? SELECTED : ""}`}
        style={{ background: cardBg(tint), ...ringColor(tint) }}
      >
        {/* Вся карточка — одна большая кнопка «открыть»; кнопки внутри лежат поверх неё. */}
        <button
          type="button"
          // Shift/Cmd/Ctrl + клик — добавить к выделению, а не открыть.
          onClick={(e) => !(e.shiftKey || e.metaKey || e.ctrlKey) && data.onOpen()}
          aria-label={format(c.openUnit, { name: data.name })}
          className="absolute inset-0 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />

        <div className="pointer-events-none flex items-start justify-between gap-2">
          <p className="line-clamp-2 break-words text-base font-bold text-ink">{data.name}</p>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white transition-transform duration-200 group-hover:translate-x-0.5"
            style={{ color: v(tint, "strong", "#1e1e1e") }}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="pointer-events-none flex items-center gap-2 rounded-2xl bg-white/70 p-2">
          {data.head ? (
            <>
              <Face m={data.head} size={28} tint={tint} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">{fullName(data.head)}</span>
                <span className="block text-[11px]" style={{ color: v(tint, "text", "#1e1e1e") }}>
                  {c.head}
                </span>
              </span>
            </>
          ) : (
            <>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed text-sm"
                style={{ borderColor: v(tint, "strong", "#737373"), color: v(tint, "text", "#1e1e1e") }}
              >
                ?
              </span>
              <span className="text-[13px] text-ink">{c.noHead}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="pointer-events-none flex">
            {faces.map((m, i) => (
              <span key={m.user_id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <Face m={m} size={24} tint={tint} ring={cardBg(tint)} />
              </span>
            ))}
            {more > 0 ? (
              <span
                className="-ml-2 flex h-6 items-center rounded-full bg-white px-2 text-[11px] font-semibold text-ink"
                style={{ boxShadow: `0 0 0 2px ${cardBg(tint)}` }}
              >
                +{more}
              </span>
            ) : null}
          </span>
          {data.direct > 0 ? (
            <button
              type="button"
              onClick={data.onToggle}
              aria-expanded={data.expanded}
              className="nodrag relative z-10 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-ink hover:bg-white/70"
            >
              {count}
              <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-200 ${data.expanded ? "rotate-180" : ""}`} />
            </button>
          ) : (
            <span className="pointer-events-none text-xs font-medium text-ink">{count}</span>
          )}
        </div>
        {data.branch !== data.direct ? (
          <p className="pointer-events-none -mt-2 text-right text-[11px]" style={{ color: v(tint, "text", "#1e1e1e") }}>
            {format(c.inBranch, { n: data.branch })}
          </p>
        ) : null}

        <Collapse open={data.expanded}>
          <ul className="pointer-events-none flex flex-col rounded-2xl bg-white/70 px-2">
            {data.people.map((p) => (
              <li key={p.user_id} className="flex items-center gap-2" style={{ height: PERSON_H }}>
                <Face m={p} size={26} tint={tint} />
                <span className="truncate text-sm text-ink">{fullName(p)}</span>
              </li>
            ))}
          </ul>
        </Collapse>
      </div>

      {data.canEdit ? <AddButton data={data} tint={tint} label={format(c.addTo, { name: data.name })} /> : null}
      <Handles />
    </div>
  );
}

// Карточка рабочей страницы — в цвете своей ветки. Недоступная — серая с замком: видно только название и тип.
export function PageNode({ data, selected }: NodeProps<PageNodeType>) {
  const p = t.pages;
  const { tint } = data;
  const icon = data.locked ? (
    <LockIcon className="h-4 w-4" />
  ) : data.moduleKey === "chat" ? (
    <ChatPageIcon className="h-4 w-4" />
  ) : (
    <TasksPageIcon className="h-4 w-4" />
  );
  return (
    <div className="group relative" style={{ width: PAGE_W }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} isConnectable={false} />
      <button
        type="button"
        onClick={(e) => !data.locked && !(e.shiftKey || e.metaKey || e.ctrlKey) && data.onOpen()}
        disabled={data.locked}
        aria-label={data.locked ? `${data.name} · ${p.locked}` : data.name}
        className={`flex w-full items-center gap-2.5 rounded-2xl border-2 bg-white px-3 py-2.5 text-left transition-[transform,box-shadow] duration-200 enabled:group-hover:-translate-y-0.5 enabled:group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.1)] disabled:cursor-not-allowed disabled:opacity-60 ${
          data.highlight ? "animate-focus-pulse" : ""
        } ${selected ? SELECTED : ""}`}
        style={{ ...ringColor(tint), minHeight: PAGE_H, borderColor: data.locked ? "#e5e5e5" : v(tint, "chip", "#d4d4d4") }}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: data.locked ? "#f5f5f5" : v(tint, "bg", "#f3f0ec"), color: data.locked ? "#1e1e1e" : v(tint, "strong", "#1e1e1e") }}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">{data.name}</span>
          <span className="block truncate text-[11px] text-ink">
            {p.modules[data.moduleKey as "tasks" | "chat"] ?? ""}
            {data.extraPeople > 0
              ? ` · ${format(p.scopeExtraPeople, { n: data.extraPeople, people: pluralRu(data.extraPeople, p.peopleForms) })}`
              : ""}
          </span>
        </span>
      </button>
    </div>
  );
}

export const nodeTypes = { root: RootNode, unit: UnitNode, page: PageNode };
