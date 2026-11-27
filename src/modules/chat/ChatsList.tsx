"use client";

import { useEffect, useState } from "react";
import { format, t } from "@/lib/i18n";
import { ModuleIcon } from "@/modules/pages/PagesList";
import { cachedAuthor } from "./api";
import { refreshChats, type ChatSummary } from "./chats";
import { badgeText, chatPreview, listTime } from "./logic";

// Список чатов раздела «Сообщения»: как в мессенджерах — свежие сверху, время, счётчик.
export function ChatsList({
  chats,
  failed,
  me,
  selected,
  onOpen,
}: {
  chats: ChatSummary[] | null;
  failed: boolean;
  me: string;
  selected: string | null;
  onOpen: (pageId: string, e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const m = t.messages;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // Время считаем только в браузере (часовой пояс телефона); обновляем раз в минуту.
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-10 text-center">
        <p className="text-[15px] text-ink">{m.loadFailed}</p>
        <button type="button" onClick={() => refreshChats(0)} className="text-[15px] font-medium text-accent underline underline-offset-4">
          {m.retry}
        </button>
      </div>
    );
  }
  if (chats === null) return <ListSkeleton />;
  if (chats.length === 0) return <EmptyList />;

  const words = { today: t.chat.today, yesterday: t.chat.yesterday };
  return (
    <ul aria-label={m.listLabel} className="-mx-3 flex flex-col gap-0.5">
      {chats.map((chat) => {
        const active = chat.pageId === selected;
        const unread = chat.unread > 0;
        const author = cachedAuthor(chat.lastAuthorId);
        const preview = chatPreview(
          { at: chat.lastAt, body: chat.lastBody, authorId: chat.lastAuthorId },
          me,
          author?.name ?? null,
          { you: m.you, deleted: m.deleted, empty: m.noMessages },
        );
        return (
          <li key={chat.pageId}>
            <a
              href={`/messages?chat=${chat.pageId}`}
              onClick={(e) => onOpen(chat.pageId, e)}
              aria-current={active ? "true" : undefined}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${active ? "bg-surface" : "hover:bg-neutral-50 active:bg-surface"}`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${chat.archived ? "bg-neutral-100 text-muted" : active ? "bg-white text-ink" : "bg-surface text-ink"}`}
              >
                <ModuleIcon moduleKey="chat" className="h-6 w-6" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-baseline gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[15px] text-ink ${unread ? "font-semibold" : "font-medium"}`}>{chat.name}</span>
                  {chat.lastAt && now !== null ? (
                    <span className={`shrink-0 text-[12px] tabular-nums ${unread ? "font-semibold text-accent" : "text-muted"}`}>
                      {listTime(chat.lastAt, now, words)}
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[14px] ${unread ? "text-ink" : "text-muted"} ${chat.lastAt && chat.lastBody === null ? "italic" : ""}`}>
                    {chat.archived ? <span className="not-italic text-muted">{m.archived} · </span> : null}
                    {preview}
                  </span>
                  {unread ? (
                    <span
                      aria-label={format(m.unread, { n: chat.unread })}
                      className="flex h-5 min-w-5 shrink-0 animate-pop-in items-center justify-center rounded-full bg-accent px-1.5 text-[12px] font-semibold tabular-nums text-white"
                    >
                      {badgeText(chat.unread)}
                    </span>
                  ) : null}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2.5">
          <span className="h-12 w-12 animate-pulse rounded-2xl bg-neutral-100" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3.5 w-2/5 animate-pulse rounded-full bg-neutral-100" />
            <span className="h-3 w-4/5 animate-pulse rounded-full bg-neutral-100" />
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyList() {
  const m = t.messages;
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center">
      <svg viewBox="0 0 96 80" className="h-20 w-24" aria-hidden>
        <rect x="6" y="10" width="54" height="38" rx="14" fill="#fff" stroke="#e8e4de" strokeWidth="2" />
        <path d="M18 48 14 60l14-12" fill="#fff" stroke="#e8e4de" strokeWidth="2" strokeLinejoin="round" />
        <rect x="18" y="22" width="30" height="4" rx="2" fill="#e8e4de" />
        <rect x="18" y="31" width="20" height="4" rx="2" fill="#e8e4de" />
        <rect x="38" y="30" width="52" height="34" rx="13" fill="#bf4a31" />
        <path d="M78 64l6 10-14-10" fill="#bf4a31" />
        <circle cx="52" cy="47" r="3" fill="#fff" />
        <circle cx="64" cy="47" r="3" fill="#fff" opacity="0.8" />
        <circle cx="76" cy="47" r="3" fill="#fff" opacity="0.6" />
      </svg>
      <p className="text-base font-semibold text-ink">{m.empty}</p>
      <p className="max-w-xs text-[14px] text-muted">{m.emptyHint}</p>
    </div>
  );
}
