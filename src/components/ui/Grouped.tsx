"use client";

import { CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { InfoTip } from "./InfoTip";

// Стиль «настроек iOS»: светло-серый фон, группы — белые карточки, строки с тонкими разделителями
// от текста. Боковое меню «Работы», настройки страницы, «Сотрудники».
export { GROUPED_BG } from "./groupedStyle";

/** Группа: подпись мелким серым над белой карточкой; справа от подписи — действие; «i» — пояснение. */
export function Group({
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
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {info ? <InfoTip label={infoLabel ?? ""} align="right">{info}</InfoTip> : null}
          {action}
        </h2>
      ) : null}
      <GroupCard>{children}</GroupCard>
    </section>
  );
}

export function GroupCard({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl bg-white">{children}</div>;
}

type RowProps = {
  icon?: React.ReactNode;
  label: React.ReactNode;
  /** Вторая строка серым под названием. */
  sub?: React.ReactNode;
  /** Значение серым справа (как «Вся компания» в настройках). */
  value?: React.ReactNode;
  /** Своё содержимое справа (счётчик, метка). */
  right?: React.ReactNode;
  chevron?: boolean;
  /** Опасное действие — красный текст. */
  danger?: boolean;
  active?: boolean;
  /** Раскрыта ли связанная секция (для кнопок-строк). */
  expanded?: boolean;
} & ({ href: string; onClick?: () => void } | { href?: undefined; onClick?: () => void });

/**
 * Строка: иконка, название (и подпись), справа значение и шеврон. Разделитель начинается от текста,
 * у последней строки карточки его нет. С href — ссылка, с onClick — кнопка, иначе — просто строка.
 */
export function Row({ icon, label, sub, value, right, chevron, danger = false, active = false, expanded, href, onClick }: RowProps) {
  const interactive = !!href || !!onClick;
  const cls = `group flex w-full items-center gap-3 pl-3.5 text-left transition-colors ${
    active ? "bg-black/[0.06]" : interactive ? "hover:bg-black/[0.03] active:bg-black/[0.06]" : ""
  } ${danger ? "text-red-700" : "text-ink"}`;
  const body = (
    <>
      {icon ? <span className="flex h-6 w-6 shrink-0 items-center justify-center">{icon}</span> : null}
      <span className="flex min-h-12 min-w-0 flex-1 items-center gap-2 border-b-[0.5px] border-neutral-200 py-2 pr-3 group-last:border-b-0">
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[15px] ${active ? "font-medium" : ""}`}>{label}</span>
          {sub ? <span className="block truncate text-[13px] text-muted">{sub}</span> : null}
        </span>
        {value !== undefined && value !== null ? <span className="min-w-0 max-w-[55%] truncate text-[15px] text-muted">{value}</span> : null}
        {right}
        {chevron ? (
          <CaretRight
            size={16}
            weight="bold"
            className={`shrink-0 text-neutral-300 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          />
        ) : null}
      </span>
    </>
  );
  if (href)
    return (
      <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={cls}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} aria-expanded={expanded} className={cls}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}
