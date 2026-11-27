"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useSyncExternalStore } from "react";
import { ListDetailLayout } from "@/components/layout/ListDetailLayout";
import { t } from "@/lib/i18n";
import { ModuleIcon } from "@/modules/pages/PagesList";
import { ChatsList } from "./ChatsList";
import { ChatView } from "./ChatView";
import { useMyChats } from "./chats";

const DESKTOP = "(min-width: 768px)";
function subscribeMedia(cb: () => void) {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
/** null — ещё не знаем (сервер): чат не монтируем, чтобы не было двух подписок. */
function useIsDesktop(): boolean | null {
  return useSyncExternalStore(
    subscribeMedia,
    () => window.matchMedia(DESKTOP).matches,
    () => null,
  );
}

// «Сообщения»: слева список доступных чатов, справа — выбранный чат (тот же, что в «Работе»).
// Выбранный чат — в адресе (?chat=<id>): работают «Назад» и обновление страницы.
// Телефон: список на весь экран, чат открывается поверх на весь экран с кнопкой «Назад».
export function MessagesScreen({ me, role, hero }: { me: string; role: string | null; hero: React.ReactNode }) {
  const m = t.messages;
  const { chats, failed } = useMyChats();
  const selected = useSearchParams().get("chat");
  const desktop = useIsDesktop();
  // Чат открыт из списка (а не по прямой ссылке) — «Назад» возвращает по истории.
  const pushed = useRef(false);

  const chat = selected ? chats?.find((c) => c.pageId === selected) : undefined;

  function open(pageId: string, e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (pageId === selected) return;
    // Без запроса к серверу (history API, Next его поддерживает): список не перерисовывается заново.
    window.history.pushState(null, "", `/messages?chat=${pageId}`);
    pushed.current = true;
  }
  function back() {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", "/messages");
    }
  }

  const title = chat?.name ?? "";
  const view = (mobile: boolean) =>
    selected ? (
      <ChatView
        key={selected}
        pageId={selected}
        me={me}
        role={role}
        archived={chat?.archived ?? false}
        header={
          <header
            className={`flex shrink-0 items-center gap-3 border-b border-line bg-white ${
              mobile ? "h-14 px-2 pt-[env(safe-area-inset-top)]" : "px-6 py-4"
            }`}
          >
            {mobile ? (
              <button
                type="button"
                onClick={back}
                aria-label={m.back}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-neutral-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink">
                <ModuleIcon moduleKey="chat" className="h-5 w-5" />
              </span>
            )}
            <h2 className={`min-w-0 flex-1 truncate font-semibold text-ink ${mobile ? "text-base" : "text-[20px] tracking-[-0.01em]"}`}>{title}</h2>
            {chat ? (
              <Link
                href={`/work/p/${selected}`}
                className={`shrink-0 rounded-full text-[13px] font-medium text-ink hover:bg-surface ${
                  mobile ? "px-3 py-2 text-muted" : "inline-flex h-9 items-center border border-line px-3.5"
                }`}
              >
                {mobile ? t.nav.work : m.openInWork}
              </Link>
            ) : null}
          </header>
        }
      />
    ) : null;

  return (
    <>
      <ListDetailLayout
        title={m.title}
        detailLabel={m.detailLabel}
        list={<ChatsList chats={chats} failed={failed} me={me} selected={desktop ? selected : null} onOpen={open} />}
        // Чату нужна точная высота колонки: лента прокручивается сама, поле ввода прижато к низу.
        detail={selected ? desktop ? <div className="flex h-dvh min-w-0 flex-1 flex-col">{view(false)}</div> : null : hero}
      />
      {/* Телефон: чат поверх списка и нижней панели. Монтируется только один экземпляр чата. */}
      {selected && desktop === false ? (
        <div className="fixed inset-0 z-30 flex animate-fade-in flex-col bg-white pb-[env(safe-area-inset-bottom)]">{view(true)}</div>
      ) : null}
    </>
  );
}
