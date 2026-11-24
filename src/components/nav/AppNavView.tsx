import Link from "next/link";
import { t } from "@/lib/i18n";
import { IconGradientDefs } from "./icons";
import { NAV_ITEMS } from "./items";

type Props = { pathname: string | null; myUsername: string | null };

// Нижняя панель на телефоне и боковая на широком экране (ТЗ, раздел 15).
// pathname = null — пока адрес неизвестен, ничего не выделяем.
export function AppNavView({ pathname, myUsername }: Props) {
  return (
    <>
      <IconGradientDefs />
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
                  className="flex h-16 flex-col items-center justify-center gap-1 text-ink"
                >
                  <Icon active={active} className="h-[26px] w-[26px]" />
                  <span className={`text-[11px] leading-none ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Компьютер: меню свёрнуто до иконок, при наведении раскрывается с подписями поверх страницы. */}
      <nav
        aria-label={t.nav.label}
        className="group/nav fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col gap-8 overflow-hidden border-r border-neutral-200 bg-white px-3 py-6 transition-[width,box-shadow] duration-200 ease-out hover:w-60 hover:shadow-xl focus-within:w-60 md:flex"
      >
        <Link href="/" className="flex h-10 items-center gap-4 px-2 text-xl font-semibold tracking-tight text-ink">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-base text-white">T</span>
          <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/nav:opacity-100 group-focus-within/nav:opacity-100">
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
                  className="flex h-12 items-center gap-4 rounded-xl px-2 text-base text-ink hover:bg-neutral-100"
                >
                  <Icon active={active} className="h-7 w-7 shrink-0" />
                  <span
                    className={`whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/nav:opacity-100 group-focus-within/nav:opacity-100 ${
                      active ? "font-semibold" : ""
                    }`}
                  >
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
