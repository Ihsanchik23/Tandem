"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useSyncExternalStore } from "react";
import { ListDetailLayout } from "@/components/layout/ListDetailLayout";
import { t } from "@/lib/i18n";
import { MobileScreen } from "@/components/layout/MobileScreen";
import { PageIcon } from "@/components/ui/PageIcon";
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
  const chatView = (header?: React.ReactNode) =>
    selected ? (
      <ChatView key={selected} pageId={selected} me={me} role={role} archived={chat?.archived ?? false} header={header} />
    ) : null;

  return (
    <>
      <ListDetailLayout
        title={m.title}
        detailLabel={m.detailLabel}
        list={<ChatsList chats={chats} failed={failed} me={me} selected={desktop ? selected : null} onOpen={open} />}
        // Чату нужна точная высота колонки: лента прокручивается сама, поле ввода прижато к низу.
        detail={
          selected ? (
            desktop ? (
              <div className="flex h-dvh min-w-0 flex-1 flex-col">
                {chatView(
                  <header className="flex shrink-0 items-center gap-3 border-b border-line bg-white px-6 py-4">
                    <PageIcon moduleKey="chat" tile={40} />
                    <h2 className="min-w-0 flex-1 truncate text-[20px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
                    {chat ? (
                      <Link
                        href={`/work/p/${selected}`}
                        className="inline-flex h-9 shrink-0 items-center rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink hover:bg-line"
                      >
                        {m.openInWork}
                      </Link>
                    ) : null}
                  </header>,
                )}
              </div>
            ) : null
          ) : (
            hero
          )
        }
      />
      {/* Телефон: чат на весь экран поверх списка и нижней панели. Монтируется только один экземпляр чата. */}
      {selected && desktop === false ? (
        <MobileScreen
          title={title}
          onBack={back}
          scroll={false}
          right={
            chat ? (
              <Link href={`/work/p/${selected}`} className="rounded-full px-3 py-2 text-[13px] font-medium text-muted hover:bg-surface">
                {t.nav.work}
              </Link>
            ) : null
          }
        >
          {chatView()}
        </MobileScreen>
      ) : null}
    </>
  );
}
