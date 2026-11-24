import Link from "next/link";
import { t } from "@/lib/i18n";
import { NAV_ITEMS } from "./items";

type Props = { pathname: string | null; myUsername: string | null };

// Нижняя панель на телефоне и боковая на широком экране (ТЗ, раздел 15).
// pathname = null — пока адрес неизвестен, ничего не выделяем.
export function AppNavView({ pathname, myUsername }: Props) {
  return (
    <>
      <nav
        aria-label={t.nav.label}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {NAV_ITEMS.map(({ href, label, Icon, match }) => {
            const active = pathname !== null && match(pathname, myUsername);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                    active ? "text-accent" : "text-ink"
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

      {/* Компьютер: меню свёрнуто до иконок, при наведении раскрывается с подписями поверх страницы. */}
      <nav
        aria-label={t.nav.label}
        className="group/nav fixed inset-y-0 left-0 z-40 hidden w-16 flex-col gap-6 overflow-hidden border-r border-neutral-200 bg-white px-2 py-5 transition-[width,box-shadow] duration-150 hover:w-56 hover:shadow-xl focus-within:w-56 md:flex"
      >
        <Link href="/" className="flex h-9 items-center gap-3 px-2.5 text-xl font-semibold tracking-tight text-ink">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm text-white">T</span>
          <span className="whitespace-nowrap opacity-0 transition-opacity group-hover/nav:opacity-100 group-focus-within/nav:opacity-100">
            {t.app.name}
          </span>
        </Link>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, Icon, match }) => {
            const active = pathname !== null && match(pathname, myUsername);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-base ${
                    active ? "bg-accent/10 font-medium text-accent" : "text-ink hover:bg-neutral-100"
                  }`}
                >
                  <Icon className="shrink-0" />
                  <span className="whitespace-nowrap opacity-0 transition-opacity group-hover/nav:opacity-100 group-focus-within/nav:opacity-100">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
