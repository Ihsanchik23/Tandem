"use client";

import { CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { InfoTip } from "./InfoTip";

// Grouped list (как настройки iOS/WhatsApp) — правила в docs/design.md.
// Экран и панели — белые, карточка группы — светло-серая (bg-surface), без рамки, скругление 20px.
// Боковое меню — исключение: серый фон, белые карточки (оборачивается в OnGrayBackground).

const OnGray = createContext(false);

/** Группы внутри — белые карточки на сером фоне (только боковое меню). */
export function OnGrayBackground({ children }: { children: React.ReactNode }) {
  return <OnGray.Provider value>{children}</OnGray.Provider>;
}

/** Группа: подпись мелким серым капсом над карточкой; «i» — пояснение; справа — действие. */
export function Section({
  title,
  info,
  infoLabel,
  action,
  children,
}: {
  title?: React.ReactNode;
  info?: React.ReactNode;
  infoLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      {title ? (
        <h2 className="flex min-h-7 items-center gap-1 pl-3.5 pr-[7px] text-[12px] font-medium uppercase tracking-[0.04em] text-neutral-500">
          <span className="min-w-0 truncate">{title}</span>
          {info ? <InfoTip label={infoLabel ?? ""} align="left">{info}</InfoTip> : null}
          <span className="flex-1" />
          {action}
        </h2>
      ) : null}
      <SectionCard>{children}</SectionCard>
    </section>
  );
}

export function SectionCard({ children }: { children: React.ReactNode }) {
  const onGray = useContext(OnGray);
  // Без overflow-hidden: списки выбора (PopoverRow) выходят за край карточки. Углы подсветки строк скругляют сами строки.
  return <div className={`rounded-[20px] ${onGray ? "bg-white" : "bg-surface"}`}>{children}</div>;
}

/** Строка без своей заливки: подсветка при наведении и нажатии — затемнением, видна на любом фоне. */
const press = "hover:bg-black/[0.03] active:bg-black/[0.06]";
/** Скругление подсветки у первой и последней строки карточки (сама строка — :first/:last). */
const corners = "first:rounded-t-[20px] last:rounded-b-[20px]";
/** Тонкий разделитель от начала текста; у последней строки карточки его нет. */
const line = "border-b-[0.5px] border-line group-last:border-b-0";

type RowContent = {
  icon?: React.ReactNode;
  label: React.ReactNode;
  /** Вторая строка серым под названием. */
  sub?: React.ReactNode;
  /** Значение серым справа (как «Вся компания» в настройках). */
  value?: React.ReactNode;
  /** Своё содержимое справа (счётчик, метка, поле даты). */
  right?: React.ReactNode;
  chevron?: boolean;
  /** Опасное действие — красный текст. */
  danger?: boolean;
  /** Действие (добавить, выдать) — текст фирменного цвета. */
  accent?: boolean;
  /** Выбранная строка (раздел меню): чёрная, текст и иконка белые. */
  active?: boolean;
  /** Раскрыта ли связанная секция (шеврон поворачивается вниз). */
  expanded?: boolean;
  /** Содержимое выше обычного (несколько людей) — выравнивание по верху. */
  top?: boolean;
};

function rowClass({
  danger,
  accent,
  active,
  pressed,
  interactive,
}: {
  danger?: boolean;
  accent?: boolean;
  active?: boolean;
  /** Открыт список под строкой — подсветка как при нажатии. */
  pressed?: boolean;
  interactive: boolean;
}) {
  return `flex w-full items-center gap-3 pl-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
    active ? "rounded-2xl bg-ink text-white" : `${pressed ? "bg-black/[0.06]" : interactive ? press : ""} ${danger ? "text-red-700" : accent ? "text-accent" : "text-ink"}`
  }`;
}

function RowBody({ icon, label, sub, value, right, chevron, active, expanded, top }: RowContent) {
  return (
    <>
      {icon ? <span className={`flex h-6 w-6 shrink-0 items-center justify-center ${top ? "self-start mt-3" : ""}`}>{icon}</span> : null}
      <span className={`flex min-h-12 min-w-0 flex-1 gap-2 py-2 pr-3 ${top ? "items-start" : "items-center"} ${active ? "border-b-0" : line}`}>
        <span className={`min-w-0 flex-1 ${top ? "pt-[3px]" : ""}`}>
          <span className={`block truncate text-[15px] ${active ? "font-medium" : ""}`}>{label}</span>
          {sub ? <span className={`block truncate text-[13px] ${active ? "text-white" : "text-muted"}`}>{sub}</span> : null}
        </span>
        {value !== undefined && value !== null ? (
          <span className={`flex min-w-0 max-w-[60%] items-center justify-end truncate text-right text-[15px] ${active ? "text-white" : "text-muted"}`}>{value}</span>
        ) : null}
        {right}
        {chevron ? (
          <CaretRight
            size={16}
            weight="bold"
            className={`shrink-0 ${active ? "text-white" : "text-neutral-400"} transition-transform duration-150 ${expanded ? "rotate-90" : ""} ${top ? "mt-1" : ""}`}
            aria-hidden
          />
        ) : null}
      </span>
    </>
  );
}

type RowProps = RowContent & ({ href: string; onClick?: () => void } | { href?: undefined; onClick?: () => void });

/** Строка: иконка, название (и подпись), справа значение и шеврон. С href — ссылка, с onClick — кнопка. */
export function Row({ href, onClick, ...content }: RowProps) {
  const cls = `group ${corners} ${rowClass({ ...content, interactive: !!href || !!onClick })}`;
  const body = <RowBody {...content} />;
  if (href)
    return (
      <Link href={href} onClick={onClick} aria-current={content.active ? "page" : undefined} className={cls}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} aria-expanded={content.expanded} className={cls}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}

/**
 * Строка, по нажатию на которую под ней открывается список выбора (приоритет, ответственный, роль).
 * children получает close — закрыть после выбора. disabled — просто строка со значением.
 */
export function PopoverRow({
  popoverLabel,
  disabled = false,
  children,
  ...content
}: Omit<RowContent, "chevron" | "expanded"> & { popoverLabel: string; disabled?: boolean; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    // Escape закрывает только список. Ловим на стадии захвата: в Safari фокус после клика
    // не переходит на кнопку, и иначе событие дошло бы до панели и закрыло её целиком.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  if (disabled) return <Row {...content} />;
  return (
    // group — на обёртке: разделитель строки убирается, когда последней в карточке стоит обёртка.
    <div ref={box} className="group relative">
      <button
        type="button"
        aria-label={popoverLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`group-first:rounded-t-[20px] group-last:rounded-b-[20px] ${rowClass({ ...content, pressed: open, interactive: true })}`}
      >
        <RowBody {...content} chevron expanded={open} />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={popoverLabel}
          className="absolute left-2 right-2 top-full z-30 -mt-1 origin-top animate-pop-in rounded-2xl bg-white p-2 shadow-[0_16px_40px_-12px_rgba(30,30,30,0.28)]"
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

/** Поле внутри группы: без своей рамки и фона (16px — чтобы iPhone не увеличивал страницу). */
export const fieldInput =
  "block w-full bg-transparent text-base text-ink placeholder:text-muted focus:outline-none md:text-[15px]";

/** Поле внутри группы: подпись мелким серым сверху, поле без рамки (как «Название / Описание»). */
export function FieldRow({
  label,
  htmlFor,
  aside,
  error,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  /** Справа от подписи — например, счётчик символов. */
  aside?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group pl-3.5">
      <div className={`flex flex-col gap-0.5 py-2.5 pr-3.5 ${line}`}>
        <span className="flex items-baseline justify-between gap-3 text-[12px] text-muted">
          <label htmlFor={htmlFor}>{label}</label>
          {aside ? <span className="tabular-nums">{aside}</span> : null}
        </span>
        {children}
        {error ? <p className="animate-fade-in pt-0.5 text-[13px] text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}

/** Выбор одного из списка: строка с радио справа (выбранное — фирменного цвета). */
export function RadioRow({
  name,
  value,
  checked,
  disabled = false,
  onChange,
  icon,
  label,
  sub,
  side,
}: {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  icon?: React.ReactNode;
  label: React.ReactNode;
  sub?: React.ReactNode;
  /** Мелкая пометка перед радио (лимит, «Скоро»). */
  side?: React.ReactNode;
}) {
  return (
    <label
      className={`group ${corners} flex items-center gap-3 pl-3.5 transition-colors ${
        disabled ? "cursor-not-allowed opacity-50" : `cursor-pointer ${press} has-[:focus-visible]:bg-black/[0.05]`
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} className="sr-only" />
      {icon ? <span className="flex h-6 w-6 shrink-0 items-center justify-center">{icon}</span> : null}
      <span className={`flex min-h-[52px] min-w-0 flex-1 items-center gap-3 py-2 pr-3.5 ${line}`}>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] text-ink">{label}</span>
          {sub ? <span className="block truncate text-[13px] text-muted">{sub}</span> : null}
        </span>
        {side ? <span className="shrink-0 text-[13px] text-muted">{side}</span> : null}
        <span
          aria-hidden
          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            checked ? "border-accent bg-accent" : "border-neutral-300 bg-white"
          }`}
        >
          {checked ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
        </span>
      </span>
    </label>
  );
}

/** Отметка «несколько из списка» внутри группы: строка с галочкой-квадратом слева. */
export function CheckRow({
  checked,
  disabled = false,
  onChange,
  indent = 0,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  indent?: number;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex min-h-11 items-center gap-3 rounded-xl py-1.5 pr-2 text-[15px] text-ink ${disabled ? "cursor-not-allowed opacity-40" : `cursor-pointer ${press}`}`}
      style={{ paddingLeft: 8 + indent }}
    >
      <input type="checkbox" className="h-[18px] w-[18px] shrink-0 accent-accent" disabled={disabled} checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}
