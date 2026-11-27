"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { canGoBack } from "@/lib/nav/history";
import { t } from "@/lib/i18n";

// Экран «внутри» на телефоне: поверх нижней навигации и шапки раздела, вверху — «Назад» и название.
// Один для чата из «Сообщений» и для рабочих страниц любого модуля.
// Компьютер: обёртка исчезает (display: contents), шапка скрыта — страница выглядит как обычно.
// scroll=false — содержимое прокручивается само (чат: лента внутри, поле ввода прижато к низу).
export function MobileScreen({
  title,
  onBack,
  backFallback = "/",
  right,
  scroll = true,
  children,
}: {
  title: string;
  /** Своя логика «Назад»; по умолчанию — router.back(), а если истории нет — backFallback. */
  onBack?: () => void;
  backFallback?: string;
  right?: ReactNode;
  scroll?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const back =
    onBack ??
    (() => {
      if (canGoBack()) router.back();
      else router.push(backFallback);
    });

  return (
    <div className="max-md:fixed max-md:inset-0 max-md:z-30 max-md:flex max-md:flex-col max-md:bg-white max-md:pb-[env(safe-area-inset-bottom)] md:contents">
      <header className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-1 border-b border-line bg-white px-2 pt-[env(safe-area-inset-top)] md:hidden">
        <button
          type="button"
          onClick={back}
          aria-label={t.ui.back}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-neutral-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-ink">{title}</h1>
        {right ? <div className="flex shrink-0 items-center">{right}</div> : null}
      </header>
      <div className={`max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col md:contents ${scroll ? "max-md:overflow-y-auto max-md:overscroll-contain" : ""}`}>
        {children}
      </div>
    </div>
  );
}
