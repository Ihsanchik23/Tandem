"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import type { ShellData } from "@/lib/nav/shell";
import { canManagePage } from "@/modules/pages/logic";
import { CompanyPanel } from "./CompanyPanel";
import { MenuIcon } from "./icons";
import { sectionTitle } from "./titles";

export const MOBILE_HEADER_H = "3.5rem";

// Шапка на телефоне: бургер слева, по центру — где я сейчас (название раздела или рабочей страницы).
// Бургер выдвигает слева панель компании.
export function MobileHeader({ data }: { data: ShellData | null }) {
  const pathname = decodeURIComponent(usePathname() ?? "/");
  const [open, setOpen] = useState(false);
  const title = sectionTitle(pathname, data?.username ?? null, data?.pages ?? []);
  const n = t.nav;
  // На рабочей странице справа — «Настройки» (тем, кто может её настраивать): блока шапки на телефоне нет.
  const pageId = pathname.match(/^\/work\/p\/([^/]+)$/)?.[1];
  const page = pageId ? data?.pages.find((p) => p.id === pageId) : undefined;
  const settingsHref =
    page && data?.company && data.userId && canManagePage(data.company.role, page.createdBy, data.userId)
      ? `/work/p/${page.id}/settings`
      : null;

  // Меню закрывается при переходе на другую страницу и по Escape.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 grid h-14 grid-cols-[3rem_1fr_3rem] items-center bg-white/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!data}
          aria-label={n.menu}
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-neutral-100"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <h1 className="truncate text-center text-base font-semibold text-ink">{title}</h1>
        <div className="flex justify-end">
          {settingsHref ? (
            <Link
              href={settingsHref}
              aria-label={t.pages.settings}
              title={t.pages.settings}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-neutral-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-[22px] w-[22px]" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
              </svg>
            </Link>
          ) : null}
        </div>
      </header>

      {/* Выдвижная панель слева. Всегда в разметке, чтобы плавно и выезжать, и уезжать. */}
      <div
        inert={!open}
        aria-hidden={!open}
        className={`fixed inset-0 z-50 transition-[visibility] duration-300 md:hidden ${open ? "visible" : "invisible"}`}
      >
        <button
          type="button"
          aria-label={n.closeMenu}
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-surface pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-out ${
            open ? "translate-x-0 shadow-xl" : "-translate-x-full"
          }`}
        >
          {data ? <CompanyPanel data={data} onNavigate={() => setOpen(false)} /> : null}
        </aside>
      </div>
    </>
  );
}
