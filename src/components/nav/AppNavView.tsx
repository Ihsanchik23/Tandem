"use client";

import Link from "next/link";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { BrandMark } from "@/components/ui/BrandMark";
import { UnreadBadge } from "@/modules/chat/UnreadBadge";
import { IconGradientDefs } from "./icons";
import { NAV_ITEMS } from "./items";

// isGuest — без входа: на компьютере (от 1024px) гость видит только экран входа, боковое меню не нужно.
// unread — показывать счётчик непрочитанного на «Сообщениях» (только после входа).
type Props = { pathname: string | null; myUsername: string | null; isGuest?: boolean; unread?: boolean };

// Боковое меню компьютера раскрывается при наведении и при переходе по нему с клавиатуры.
// Раньше было focus-within: в Windows (Chrome/Edge) ссылка после клика остаётся в фокусе,
// и меню не закрывалось, пока не кликнешь мимо. Теперь — только :focus-visible (клавиатура),
// а после клика по пункту меню сворачивается сразу и снова раскрывается, когда мышь уйдёт и вернётся.
const NAV_OPEN = "hover:w-60 hover:shadow-xl has-[:focus-visible]:w-60 has-[:focus-visible]:shadow-xl";
const LABEL_OPEN = "group-hover/nav:opacity-100 group-has-[:focus-visible]/nav:opacity-100";

// Нижняя панель на телефоне и боковая на широком экране (ТЗ, раздел 15).
// pathname = null — пока адрес неизвестен, ничего не выделяем.
export function AppNavView({ pathname, myUsername, isGuest = false, unread = false }: Props) {
  // После клика по пункту меню не раскрывается, пока мышь не уйдёт с него.
  const [closed, setClosed] = useState(false);
  const open = closed ? "" : NAV_OPEN;
  const label = closed ? "" : LABEL_OPEN;
  const onPick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setClosed(true);
    e.currentTarget.blur();
  };

  return (
    <>
      <IconGradientDefs />
      <nav
        aria-label={t.nav.label}
        className="fixed inset-x-0 bottom-0 z-20 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-8px_rgba(0,0,0,0.15)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {NAV_ITEMS.map(({ href, label, Icon, match }) => {
            const active = pathname !== null && match(pathname, myUsername);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  // Только значки, без подписей; название раздела — для экранного диктора.
                  aria-label={label}
                  className="flex h-16 items-center justify-center text-ink"
                >
                  <span className="relative">
                    <Icon active={active} className="h-7 w-7" />
                    {unread && href === "/messages" ? <UnreadBadge className="absolute -right-2.5 -top-1.5" /> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Компьютер: меню свёрнуто до иконок, при наведении раскрывается с подписями поверх страницы. */}
      <nav
        aria-label={t.nav.label}
        onMouseLeave={() => setClosed(false)}
        className={`group/nav fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col gap-8 overflow-hidden border-r-[0.5px] border-neutral-300 bg-white px-3 py-6 transition-[width,box-shadow] duration-200 ease-out md:flex ${open} ${isGuest ? "lg:hidden" : ""}`}
      >
        <Link href="/" onClick={onPick} className="flex h-10 items-center gap-4 px-2 text-xl font-semibold tracking-tight text-ink">
          <BrandMark size={32} className="h-8 w-8 shrink-0" />
          <span className={`whitespace-nowrap opacity-0 transition-opacity duration-200 ${label}`}>{t.app.name}</span>
        </Link>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label: name, Icon, match }) => {
            const active = pathname !== null && match(pathname, myUsername);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onPick}
                  aria-current={active ? "page" : undefined}
                  aria-label={name}
                  className="flex h-12 items-center gap-4 rounded-xl px-2 text-base text-ink hover:bg-neutral-100"
                >
                  <span className="relative shrink-0">
                    <Icon active={active} className="h-7 w-7" />
                    {unread && href === "/messages" ? <UnreadBadge className="absolute -right-2.5 -top-1.5" /> : null}
                  </span>
                  <span className={`whitespace-nowrap opacity-0 transition-opacity duration-200 ${label} ${active ? "font-semibold" : ""}`}>
                    {name}
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
