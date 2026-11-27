"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { format, t } from "@/lib/i18n";
import { cachedAuthor } from "./api";
import { Composer, type ComposerHandle } from "./Composer";
import { buildFeed, canDeleteMessage, type ChatMessage } from "./logic";
import { MessageItem } from "./MessageItem";
import { ActionMenu, ConfirmDelete } from "./Overlays";
import { useChat } from "./useChat";

/** Ближе к низу, чем столько пикселей, — считаем, что пользователь внизу. */
const BOTTOM_PX = 80;
/** Ближе к верху — подгружаем историю заранее, чтобы не упираться. */
const TOP_PX = 400;

type Props = {
  pageId: string;
  me: string;
  /** Роль в компании — только чтобы показать «Удалить» у чужих (права проверяет база). */
  role: string | null;
  archived: boolean;
  /** Шапка над лентой (название чата, «Назад»). */
  header?: React.ReactNode;
};

// Чат рабочей страницы — один и тот же в «Работе» и в «Сообщениях»: одна история и один счётчик.
export function ChatView({ pageId, me, role, archived, header }: Props) {
  const c = t.chat;
  const chat = useChat({ pageId, me, archived });
  const { messages, load, status, hasMore, loadingOlder, markRead, loadOlder, ensureLoaded } = chat;

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [menuFor, setMenuFor] = useState<ChatMessage | null>(null);
  const [confirmFor, setConfirmFor] = useState<ChatMessage | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [unseen, setUnseen] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [copied, setCopied] = useState(false);
  const [jumpTick, setJumpTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const composer = useRef<ComposerHandle>(null);
  const atBottomRef = useRef(true);
  const initialDone = useRef(false);
  const saved = useRef({ top: 0, height: 0 });
  const edges = useRef<{ first?: string; last?: string }>({});
  const pendingJump = useRef<string | null>(null);

  // Другой чат — всё с начала.
  const [seenPage, setSeenPage] = useState(pageId);
  if (seenPage !== pageId) {
    setSeenPage(pageId);
    setReplyTo(null);
    setMenuFor(null);
    setConfirmFor(null);
    setUnseen(0);
    setAtBottom(true);
  }
  useLayoutEffect(() => {
    initialDone.current = false;
    atBottomRef.current = true;
    edges.current = {};
  }, [pageId]);

  // «Сегодня/Вчера» переключаются в полночь.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const feed = useMemo(() => buildFeed(messages, now, { today: c.today, yesterday: c.yesterday }), [messages, now, c.today, c.yesterday]);

  const remember = () => {
    const el = scroller.current;
    if (el) saved.current = { top: el.scrollTop, height: el.scrollHeight };
  };
  const toBottom = (smooth = false) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduce ? "smooth" : "auto" });
  };

  // Прокрутка после изменения ленты: открыть внизу, не прыгать при подгрузке истории,
  // ехать вниз за новыми сообщениями только если пользователь и так внизу.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const first = messages[0]?.clientId;
    const last = messages[messages.length - 1]?.clientId;
    const prev = edges.current;

    if (!initialDone.current) {
      if (load === "ready") {
        el.scrollTop = el.scrollHeight;
        initialDone.current = true;
        atBottomRef.current = true;
      }
    } else {
      // История добавилась сверху — сохраняем видимое место.
      if (prev.first && first !== prev.first && messages.some((m) => m.clientId === prev.first)) {
        el.scrollTop = saved.current.top + (el.scrollHeight - saved.current.height);
      }
      if (last !== prev.last) {
        const idx = messages.findIndex((m) => m.clientId === prev.last);
        const added = idx >= 0 ? messages.slice(idx + 1) : [];
        const sentByMe = added.some((m) => m.authorId === me && m.state !== "sent");
        const fromOthers = added.filter((m) => m.authorId !== me).length;
        if (atBottomRef.current || sentByMe) {
          el.scrollTop = el.scrollHeight;
          atBottomRef.current = true;
          if (fromOthers) markRead();
        } else if (fromOthers) {
          setUnseen((n) => n + fromOthers);
        }
      }
    }
    edges.current = { first, last };
    remember();
  }, [messages, load, me, markRead]);

  // Открыли чат — прочитан. Вернулись на вкладку внизу ленты — тоже.
  useEffect(() => {
    if (load !== "ready") return;
    if (atBottomRef.current) markRead();
    const onVisible = () => document.visibilityState === "visible" && atBottomRef.current && markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load, markRead]);

  // Поле ввода выросло, шрифт догрузился — если были внизу, остаёмся внизу.
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (initialDone.current && atBottomRef.current) el.scrollTop = el.scrollHeight;
      remember();
    });
    ro.observe(el);
    if (content.current) ro.observe(content.current);
    return () => ro.disconnect();
  }, [load, status]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_PX;
    if (bottom !== atBottomRef.current) {
      atBottomRef.current = bottom;
      setAtBottom(bottom);
      if (bottom) markRead();
    }
    if (bottom && unseen) setUnseen(0);
    if (initialDone.current && el.scrollTop < TOP_PX && hasMore) void loadOlder();
    remember();
  };

  // Переход к оригиналу цитаты: догрузить историю, прокрутить, коротко подсветить.
  const jump = useCallback(
    async (id: string) => {
      if (!(await ensureLoaded(id))) return;
      pendingJump.current = id;
      setJumpTick((n) => n + 1);
    },
    [ensureLoaded],
  );
  useLayoutEffect(() => {
    const id = pendingJump.current;
    if (!id) return;
    const node = scroller.current?.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(id)}"]`);
    if (!node) return;
    pendingJump.current = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    setHighlight(id);
  }, [messages, jumpTick]);
  useEffect(() => {
    if (!highlight) return;
    const id = setTimeout(() => setHighlight(null), 1600);
    return () => clearTimeout(id);
  }, [highlight]);

  // Подсказки: «Скопировано», ошибки — исчезают сами.
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);
  const { notice, setNotice } = chat;
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(id);
  }, [notice, setNotice]);

  const canWrite = status === "active";
  const onReply = useCallback((m: ChatMessage) => {
    setMenuFor(null);
    setReplyTo(m);
    requestAnimationFrame(() => composer.current?.focus());
  }, []);
  const onCopy = useCallback((m: ChatMessage) => {
    setMenuFor(null);
    if (!m.body) return;
    void navigator.clipboard?.writeText(m.body).then(() => setCopied(true));
  }, []);
  const onDelete = useCallback((m: ChatMessage) => {
    setMenuFor(null);
    setConfirmFor(m);
  }, []);
  const onMenu = useCallback((m: ChatMessage) => setMenuFor(m), []);

  if (status === "no_access") return <NoAccess header={header} />;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-white">
      {header}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scroller}
          onScroll={onScroll}
          role="log"
          aria-label={c.feedLabel}
          aria-live="polite"
          aria-busy={load === "loading"}
          // overflow-anchor: none — позицию при подгрузке истории держим сами (одинаково в Safari и Chrome).
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none]"
        >
          <div ref={content} className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end px-3 pb-3 pt-2 md:px-6">
            {load === "loading" ? <FeedSkeleton /> : null}
            {load === "failed" && messages.length === 0 ? (
              <p className="m-auto px-6 text-center text-[15px] text-muted">{c.loadFailed}</p>
            ) : null}
            {load === "ready" && messages.length === 0 ? <EmptyChat /> : null}

            {messages.length ? (
              <p className="py-3 text-center text-[12px] text-muted" aria-live="off">
                {loadingOlder ? c.loadingOlder : !hasMore ? c.historyStart : " "}
              </p>
            ) : null}

            {feed.map((item) =>
              item.kind === "day" ? (
                <div key={item.key} className="sticky top-2 z-[1] my-3 flex justify-center first:mt-0">
                  <span className="rounded-full border border-line bg-white/95 px-3 py-1 text-[12px] font-medium text-muted shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur">
                    {item.label}
                  </span>
                </div>
              ) : (
                <MessageItem
                  key={item.key}
                  message={item.message}
                  author={cachedAuthor(item.message.authorId)}
                  mine={item.message.authorId === me}
                  first={item.first}
                  last={item.last}
                  quote={item.message.replyToId ? findQuote(messages, chat.quotes, item.message.replyToId) : undefined}
                  quoteAuthor={(() => {
                    const q = item.message.replyToId ? findQuote(messages, chat.quotes, item.message.replyToId) : null;
                    return q ? cachedAuthor(q.authorId) : null;
                  })()}
                  highlighted={highlight !== null && item.message.id === highlight}
                  canReply={canWrite}
                  canDelete={canDeleteMessage(item.message, me, role)}
                  onReply={onReply}
                  onDelete={onDelete}
                  onCopy={onCopy}
                  onMenu={onMenu}
                  onRetry={chat.retry}
                  onDiscard={chat.discard}
                  onJump={jump}
                />
              ),
            )}
          </div>
        </div>

        {/* Читает старое — не дёргаем ленту, а показываем кнопку. */}
        {!atBottom && load === "ready" ? (
          <button
            type="button"
            onClick={() => {
              setUnseen(0);
              toBottom(true);
            }}
            className={`absolute bottom-3 right-4 z-[2] flex h-10 animate-pop-in items-center gap-1.5 rounded-full shadow-lg transition-colors md:right-6 ${
              unseen ? "bg-accent px-4 text-[14px] font-semibold text-white hover:bg-accent-hover" : "w-10 justify-center border border-line bg-white text-ink hover:bg-surface"
            }`}
            aria-label={unseen ? format(c.newMessages, { n: unseen }) : c.toBottom}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
            {unseen ? format(c.newMessages, { n: unseen > 99 ? "99+" : unseen }) : null}
          </button>
        ) : null}

        {copied || notice ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[3] flex justify-center px-4">
            <p role="status" className="animate-fade-in rounded-full bg-ink px-4 py-2 text-[14px] text-white shadow-lg">
              {notice ? c.errors[notice] : c.copied}
            </p>
          </div>
        ) : null}
      </div>

      {status === "archived" ? (
        <p className="shrink-0 border-t border-line bg-surface px-4 py-4 text-center text-[15px] text-muted">
          {c.archived}
        </p>
      ) : (
        <Composer
          ref={composer}
          replyTo={replyTo}
          replyAuthor={replyTo ? cachedAuthor(replyTo.authorId) : null}
          onCancelReply={() => setReplyTo(null)}
          onSend={(text) => {
            chat.send(text, replyTo?.id ?? null);
            setReplyTo(null);
            setUnseen(0);
            atBottomRef.current = true;
          }}
        />
      )}

      {menuFor ? (
        <ActionMenu
          message={menuFor}
          canReply={canWrite}
          canDelete={canDeleteMessage(menuFor, me, role)}
          onReply={() => onReply(menuFor)}
          onCopy={() => onCopy(menuFor)}
          onDelete={() => onDelete(menuFor)}
          onClose={() => setMenuFor(null)}
        />
      ) : null}
      {confirmFor ? (
        <ConfirmDelete
          onClose={() => setConfirmFor(null)}
          onConfirm={async () => {
            const m = confirmFor;
            setConfirmFor(null);
            if (replyTo?.clientId === m.clientId) setReplyTo(null);
            const res = await chat.remove(m);
            if (!res.ok) setNotice(res.error);
          }}
        />
      ) : null}
    </div>
  );
}

/** Оригинал цитаты: в ленте → в кэше цитат → undefined (грузится) / null (удалён совсем). */
function findQuote(list: readonly ChatMessage[], quotes: ReadonlyMap<string, ChatMessage>, id: string) {
  return list.find((m) => m.id === id) ?? quotes.get(id);
}

function FeedSkeleton() {
  const rows = [
    { mine: false, w: "w-48" },
    { mine: false, w: "w-64" },
    { mine: true, w: "w-40" },
    { mine: false, w: "w-56" },
    { mine: true, w: "w-52" },
  ];
  return (
    <div aria-hidden className="flex flex-col gap-3 py-4">
      {rows.map((r, i) => (
        <div key={i} className={`flex items-end gap-2 ${r.mine ? "justify-end" : ""}`}>
          {!r.mine ? <span className="h-8 w-8 animate-pulse rounded-full bg-neutral-100" /> : null}
          <span className={`h-10 ${r.w} animate-pulse rounded-[18px] bg-neutral-100`} />
        </div>
      ))}
    </div>
  );
}

function EmptyChat() {
  const c = t.chat;
  return (
    <div className="m-auto flex max-w-xs flex-col items-center gap-3 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-surface text-accent">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z" />
          <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
        </svg>
      </span>
      <p className="text-base font-semibold text-ink">{c.empty}</p>
      <p className="text-[14px] text-muted">{c.emptyHint}</p>
    </div>
  );
}

function NoAccess({ header }: { header?: React.ReactNode }) {
  const c = t.chat;
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-white">
      {header}
      <div role="alert" className="m-auto flex max-w-sm flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-surface text-ink">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        <h2 className="text-lg font-semibold text-ink">{c.noAccessTitle}</h2>
        <p className="text-[15px] text-muted">{c.noAccessText}</p>
        <Link href="/work" className="mt-1 text-[15px] font-medium text-accent underline underline-offset-4">
          {c.backToWork}
        </Link>
      </div>
    </div>
  );
}
