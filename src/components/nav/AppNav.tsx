"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";
import { NAV_ITEMS } from "./items";

// Нижняя панель на телефоне и боковая на широком экране (ТЗ, раздел 15).
export function AppNav() {
  const pathname = decodeURIComponent(usePathname() ?? "/");

  return (
    <>
      <nav
        aria-label={t.nav.label}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {NAV_ITEMS.map(({ href, label, Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                    active ? "text-neutral-900" : "text-neutral-500"
                  }`}
                >
                  <Icon className={active ? "stroke-[2.2]" : ""} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label={t.nav.label}
        className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col gap-6 border-r border-neutral-200 bg-white px-3 py-6 md:flex"
      >
        <Link href="/" className="px-3 text-xl font-semibold tracking-tight text-neutral-900">
          {t.app.name}
        </Link>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-base ${
                    active ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
