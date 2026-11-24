"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import type { ShellData } from "@/lib/nav/shell";
import { Avatar } from "@/components/profile/Avatar";
import { CompanyPanel } from "./CompanyPanel";
import { sectionTitle } from "./titles";

export const MOBILE_HEADER_H = "3.5rem";

// Шапка на телефоне: бургер слева, заголовок по центру, круглый логотип компании справа.
// Бургер выдвигает слева панель компании.
export function MobileHeader({ data }: { data: ShellData | null }) {
  const pathname = decodeURIComponent(usePathname() ?? "/");
  const [open, setOpen] = useState(false);
  const title = sectionTitle(pathname, data?.username ?? null);
  const n = t.nav;

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
      <header className="sticky top-0 z-30 grid h-14 grid-cols-[3rem_1fr_3rem] items-center border-b border-neutral-200 bg-white/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!data}
          aria-label={n.menu}
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-neutral-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="truncate text-center text-base font-semibold text-ink">{title}</h1>
        <div className="flex justify-end">
          {data?.company ? (
            <Link href={`/c/${data.company.slug}`} aria-label={n.companyLogo} className="p-1">
              <Avatar url={data.company.logoUrl} name={data.company.name} size={32} />
            </Link>
          ) : null}
        </div>
      </header>

      {/* Выдвижная панель слева. Остаётся в DOM, чтобы плавно выезжать. */}
      <div className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <button
          type="button"
          aria-label={n.closeMenu}
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {data && open ? <CompanyPanel data={data} onNavigate={() => setOpen(false)} /> : null}
        </aside>
      </div>
    </>
  );
}
