"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { format, t } from "@/lib/i18n";
import { CloseIcon, FilterIcon } from "@/components/nav/icons";

// Общий фильтр Tandem (каталог «Поиска», задачи). Фильтры применяются сразу — кнопки «Применить» нет.
// Компьютер: поповер под кнопкой. Телефон: шторка снизу с затемнением.
// Внутри — разделы (FilterSection) с чипсами (ChoiceChips), прокручиваемым списком с поиском
// (OptionList) или переключателем (FilterSwitch). Выбранное видно рядами чипсов (ActiveFilters).

export function FilterMenu({
  count,
  onReset,
  align = "right",
  compact = false,
  large = false,
  children,
}: {
  /** Сколько фильтров выбрано — число на кнопке и «Сбросить» в шапке. */
  count: number;
  onReset: () => void;
  /** С какого края кнопки раскрывается поповер на компьютере. */
  align?: "left" | "right";
  /** На телефоне — только значок, без подписи. */
  compact?: boolean;
  /** Высота кнопки 44 px — рядом с крупной строкой поиска. */
  large?: boolean;
  children: React.ReactNode;
}) {
  const f = t.ui.filters;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Закрывается по Escape и по нажатию мимо (на компьютере; на телефоне — по затемнению).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={count > 0 ? `${f.title}: ${count}` : f.title}
        className={`inline-flex items-center gap-2 rounded-full border px-3 ${large ? "h-11 min-w-11 justify-center" : "h-10"} text-[13px] font-medium text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
          compact ? "" : "md:px-3.5"
        } ${open ? "border-ink/80 bg-white" : "border-line bg-white hover:border-neutral-300 hover:bg-surface"}`}
      >
        <FilterIcon className="h-[18px] w-[18px] shrink-0" />
        <span className={compact ? "sr-only md:not-sr-only" : ""}>{f.title}</span>
        {count > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold tabular-nums text-white">
            {count}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          {/* Затемнение — только на телефоне. */}
          <div aria-hidden onClick={() => setOpen(false)} className="animate-fade-in fixed inset-0 z-40 bg-black/30 md:hidden" />
          <div
            id={panelId}
            role="dialog"
            aria-label={f.title}
            className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] animate-sheet-up flex-col rounded-t-[28px] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_rgba(0,0,0,0.18)] md:absolute md:inset-x-auto md:bottom-auto md:top-full md:mt-2 md:max-h-[min(34rem,75dvh)] md:w-[22rem] md:animate-pop-in md:rounded-[22px] md:border md:border-line md:pb-0 md:shadow-[0_18px_48px_-12px_rgba(30,30,30,0.22)] ${
              align === "right" ? "md:right-0 md:origin-top-right" : "md:left-0 md:origin-top-left"
            }`}
          >
            <span aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-neutral-200 md:hidden" />
            <header className="flex shrink-0 items-center gap-2 px-5 pb-2 pt-3 md:pt-4">
              <h2 className="flex-1 text-[17px] font-semibold tracking-[-0.01em] text-ink">{f.title}</h2>
              {count > 0 ? (
                <button
                  type="button"
                  onClick={onReset}
                  className="h-8 rounded-full px-3 text-[13px] font-medium text-accent transition-colors hover:bg-accent/10"
                >
                  {f.reset}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.ui.close}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink transition-colors hover:bg-neutral-200"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </header>
            <div className="flex flex-col divide-y divide-line overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
          </div>
        </>
      ) : null}
    </div>
  );
}

// Раздел фильтра: заголовок, справа — что выбрано сейчас.
export function FilterSection({ title, value, children }: { title: string; value?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 py-4 first:pt-2">
      <h3 className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{title}</span>
        {value ? <span className="truncate text-[13px] text-ink">{value}</span> : null}
      </h3>
      {children}
    </section>
  );
}

export type Option<T extends string> = { value: T; label: string; sub?: string; leading?: React.ReactNode };

// Несколько вариантов — чипсами. Повторное нажатие на выбранный не нужно: есть вариант «Любой».
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
              on ? "bg-ink text-white" : "bg-surface text-ink hover:bg-neutral-200/70"
            }`}
          >
            {o.leading}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

// Много вариантов — прокручиваемый список с поиском. freeText: можно выбрать то, чего нет в списке
// (например, город, которого нет в подсказках) — строкой «Искать «…»».
export function OptionList<T extends string>({
  options,
  value,
  onChange,
  label,
  searchPlaceholder,
  freeText,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  searchPlaceholder?: string;
  freeText?: (query: string) => T;
}) {
  const f = t.ui.filters;
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase("ru");
  const shown = useMemo(
    () => (q ? options.filter((o) => `${o.label} ${o.sub ?? ""}`.toLocaleLowerCase("ru").includes(q)) : options),
    [options, q],
  );
  const exact = options.some((o) => o.label.toLocaleLowerCase("ru") === q);
  const searchable = options.length > 6 || freeText !== undefined;

  return (
    <div className="flex flex-col gap-2">
      {searchable ? (
        <label className="flex h-10 items-center gap-2 rounded-xl bg-surface px-3 text-muted focus-within:ring-2 focus-within:ring-accent/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? f.search}
            aria-label={searchPlaceholder ?? f.search}
            className="h-full min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none md:text-[13px]"
          />
        </label>
      ) : null}
      <div role="listbox" aria-label={label} className="-mx-1.5 flex max-h-56 flex-col gap-0.5 overflow-y-auto overscroll-contain px-0.5">
        {freeText && q && !exact ? (
          <Row selected={false} onClick={() => { onChange(freeText(query.trim())); setQuery(""); }}>
            <span className="truncate font-medium text-accent">{format(f.searchFor, { q: query.trim() })}</span>
          </Row>
        ) : null}
        {shown.map((o) => (
          <Row key={o.value} selected={o.value === value} onClick={() => onChange(o.value)}>
            {o.leading}
            <span className="min-w-0 flex-1">
              <span className="block truncate">{o.label}</span>
              {o.sub ? <span className="block truncate text-[12px] text-muted">{o.sub}</span> : null}
            </span>
          </Row>
        ))}
        {shown.length === 0 && !(freeText && q) ? <p className="px-2.5 py-3 text-[13px] text-muted">{f.nothingFound}</p> : null}
      </div>
    </div>
  );
}

function Row({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`flex min-h-11 w-full shrink-0 items-center gap-2.5 rounded-xl px-2.5 text-left text-[14px] text-ink transition-colors ${
        selected ? "bg-accent/[0.08] font-medium" : "hover:bg-surface"
      }`}
    >
      {children}
      <CheckIcon className={`ml-auto h-4 w-4 shrink-0 text-accent ${selected ? "opacity-100" : "opacity-0"}`} />
    </button>
  );
}

// Включить или выключить (например, «Только просроченные»).
export function FilterSwitch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-11 w-full items-center gap-3 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-ink">{label}</span>
        {hint ? <span className="block text-[12px] text-muted">{hint}</span> : null}
      </span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-accent" : "bg-neutral-300"}`}>
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

// Выбранные фильтры чипсами под строкой поиска: видно, что включено, и снять можно одним нажатием.
export function ActiveFilters({ items, onResetAll }: { items: { key: string; label: string; onRemove: () => void }[]; onResetAll?: () => void }) {
  const f = t.ui.filters;
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={it.onRemove}
          aria-label={format(f.remove, { label: it.label })}
          className="group inline-flex h-8 animate-fade-in items-center gap-1 rounded-full bg-ink pl-3 pr-1.5 text-[12px] font-medium text-white transition-colors hover:bg-neutral-700"
        >
          {it.label}
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-colors group-hover:bg-white/25">
            <CloseIcon className="h-3 w-3" />
          </span>
        </button>
      ))}
      {onResetAll && items.length > 1 ? (
        <button type="button" onClick={onResetAll} className="h-8 rounded-full px-2.5 text-[12px] font-medium text-accent hover:bg-accent/10">
          {f.resetAll}
        </button>
      ) : null}
    </div>
  );
}
