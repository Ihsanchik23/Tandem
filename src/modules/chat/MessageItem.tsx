"use client";

import { memo, useRef } from "react";
import { Avatar } from "@/components/profile/Avatar";
import { format, t } from "@/lib/i18n";
import type { Author } from "./api";
import { linkify, timeOf, type ChatMessage } from "./logic";

const LONG_PRESS_MS = 450;

export type MessageItemProps = {
  message: ChatMessage;
  author: Author | null | undefined;
  mine: boolean;
  first: boolean;
  last: boolean;
  /** Оригинал цитаты: undefined — ещё грузится, null — не найден. */
  quote: ChatMessage | null | undefined;
  quoteAuthor: Author | null | undefined;
  highlighted: boolean;
  canReply: boolean;
  canDelete: boolean;
  onReply: (m: ChatMessage) => void;
  onDelete: (m: ChatMessage) => void;
  onCopy: (m: ChatMessage) => void;
  onMenu: (m: ChatMessage) => void;
  onRetry: (clientId: string) => void;
  onDiscard: (clientId: string) => void;
  onJump: (id: string) => void;
};

// Одно сообщение. Свои — справа, фирменным цветом; чужие — слева, с аватаром у последнего в группе
// и именем у первого. Действия: на компьютере — при наведении, на телефоне — долгое нажатие.
export const MessageItem = memo(function MessageItem(p: MessageItemProps) {
  const c = t.chat;
  const m = p.message;
  const deleted = m.deletedAt !== null;
  const name = p.author?.name || c.unknownAuthor;
  const hasActions = !deleted && m.state === "sent" && (p.canReply || p.canDelete || !!m.body);

  // Долгое нажатие пальцем — меню снизу. Сдвиг пальца (прокрутка) отменяет.
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || !hasActions) return;
    cancelPress();
    press.current = {
      x: e.clientX,
      y: e.clientY,
      timer: setTimeout(() => {
        press.current = null;
        navigator.vibrate?.(10);
        swallowNextClick();
        p.onMenu(m);
      }, LONG_PRESS_MS),
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = press.current;
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) cancelPress();
  };

  const bubbleShape = p.mine
    ? `rounded-[18px] ${p.last ? "rounded-br-[6px]" : ""}`
    : `rounded-[18px] ${p.last ? "rounded-bl-[6px]" : ""}`;
  const bubbleColor = deleted
    ? "bg-surface text-muted"
    : p.mine
      ? "bg-accent text-white" // осознанное исключение из ролей цвета: свои сообщения — акцент (docs/design.md)
      : "bg-surface text-ink";

  return (
    <div
      data-message-id={m.id ?? undefined}
      className={`group/msg relative flex items-end gap-2 ${p.mine ? "flex-row-reverse" : ""} ${p.first ? "mt-3" : "mt-0.5"}`}
    >
      {/* Аватар — у последнего сообщения группы чужих; место под него держим всегда. */}
      {!p.mine ? (
        <div className="w-8 shrink-0">{p.last ? <Avatar url={p.author?.avatarUrl} name={name} size={32} /> : null}</div>
      ) : null}

      <div className={`flex min-w-0 max-w-[min(78%,34rem)] flex-col ${p.mine ? "items-end" : "items-start"}`}>
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => {
            // На телефоне долгое нажатие — наше меню, а не системное.
            if (hasActions && window.matchMedia("(pointer: coarse)").matches) e.preventDefault();
          }}
          className={`relative min-w-0 max-w-full px-3.5 py-2 text-[15px] leading-[1.4] transition-[box-shadow,opacity] duration-300 pointer-coarse:select-none [-webkit-touch-callout:none] ${bubbleShape} ${bubbleColor} ${
            m.state === "sending" ? "opacity-70" : ""
          } ${p.highlighted ? "animate-focus-pulse ring-2 ring-ink/25 ring-offset-2" : ""}`}
        >
          {!p.mine && p.first && !deleted ? (
            <p className="mb-0.5 truncate text-[13px] font-semibold text-ink">{name}</p>
          ) : null}

          {m.replyToId && !deleted ? (
            <Quote
              quote={p.quote}
              author={p.quoteAuthor}
              mine={p.mine}
              onJump={() => m.replyToId && p.onJump(m.replyToId)}
            />
          ) : null}

          {deleted ? (
            <p className="italic">
              {c.deleted}
              <span aria-hidden className="inline-block w-12" />
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              <Body text={m.body ?? ""} mine={p.mine} />
              {/* Место под время справа внизу, как в мессенджерах. */}
              <span aria-hidden className="inline-block w-12" />
            </p>
          )}
          <span
            title={new Date(m.createdAt).toLocaleString("ru-RU")}
            className={`absolute bottom-1.5 right-3 flex items-center gap-1 text-[11px] tabular-nums ${
              deleted ? "text-muted" : p.mine ? "text-white/75" : "text-muted"
            }`}
          >
            {m.state === "sending" ? <ClockIcon /> : null}
            {m.state === "sending" ? <span className="sr-only">{c.sending}</span> : null}
            {timeOf(m.createdAt)}
          </span>
        </div>

        {m.state === "failed" ? (
          <div role="alert" className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[13px]">
            <span className="font-medium text-accent">
              {c.notSent}
              {m.error && m.error !== "network" ? ` · ${c.errors[m.error as keyof typeof c.errors] ?? ""}` : ""}
            </span>
            <button type="button" onClick={() => p.onRetry(m.clientId)} className="font-semibold text-ink underline underline-offset-2">
              {c.retry}
            </button>
            <button type="button" onClick={() => p.onDiscard(m.clientId)} className="text-muted hover:text-ink">
              {c.discard}
            </button>
          </div>
        ) : null}
      </div>

      {/* Компьютер: действия при наведении (и с клавиатуры). На сенсорных экранах — меню по долгому нажатию. */}
      {hasActions ? (
        <div className="hidden self-center opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 focus-within:opacity-100 pointer-fine:flex">
          <div className="flex items-center gap-0.5 rounded-full bg-white p-0.5 shadow-[0_2px_10px_rgba(30,30,30,0.14)]">
            {p.canReply ? (
              <ToolButton label={c.reply} onClick={() => p.onReply(m)}>
                <ReplyIcon />
              </ToolButton>
            ) : null}
            {m.body ? (
              <ToolButton label={c.copy} onClick={() => p.onCopy(m)}>
                <CopyIcon />
              </ToolButton>
            ) : null}
            {p.canDelete ? (
              <ToolButton label={c.delete} onClick={() => p.onDelete(m)} danger>
                <TrashIcon />
              </ToolButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
});

// Палец отпустили после долгого нажатия — браузер может прислать «клик» в ту же точку,
// а там уже затемнение меню: меню закрылось бы сразу. Гасим один такой клик.
function swallowNextClick() {
  const stop = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    done();
  };
  const done = () => {
    window.removeEventListener("click", stop, true);
    window.removeEventListener("pointerup", released, true);
    clearTimeout(timer);
  };
  // Клик приходит сразу после того, как палец отпущен; держат палец сколько угодно.
  const released = () => setTimeout(done, 300);
  const timer = setTimeout(done, 10_000);
  window.addEventListener("click", stop, true);
  window.addEventListener("pointerup", released, { capture: true, once: true });
}

function Body({ text, mine }: { text: string; mine: boolean }) {
  return (
    <>
      {linkify(text).map((part, i) =>
        part.kind === "link" ? (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onPointerDown={(e) => e.stopPropagation()}
            className={`underline underline-offset-2 ${mine ? "text-white decoration-white/60" : "text-accent decoration-accent"}`}
          >
            {part.text}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

function Quote({
  quote,
  author,
  mine,
  onJump,
}: {
  quote: ChatMessage | null | undefined;
  author: Author | null | undefined;
  mine: boolean;
  onJump: () => void;
}) {
  const c = t.chat;
  const deleted = quote === null || (quote && quote.deletedAt !== null);
  const text = quote === undefined ? "…" : deleted ? c.deleted : (quote.body ?? "").replace(/\s+/g, " ");
  return (
    <button
      type="button"
      onClick={onJump}
      disabled={!quote || deleted}
      className={`mb-1 mt-0.5 flex w-full min-w-0 flex-col rounded-lg border-l-[3px] px-2.5 py-1 text-left text-[13px] leading-snug transition-colors ${
        mine ? "border-white/70 bg-white/15 hover:bg-white/25" : "border-ink bg-white/70 hover:bg-white"
      } disabled:cursor-default`}
    >
      {quote && !deleted ? (
        <span className={`truncate font-semibold ${mine ? "text-white" : "text-ink"}`}>{author?.name || c.unknownAuthor}</span>
      ) : null}
      <span className={`line-clamp-2 break-words [overflow-wrap:anywhere] ${deleted ? "italic" : ""} ${mine ? "text-white/85" : "text-muted"}`}>
        {text}
      </span>
    </button>
  );
}

function ToolButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
        danger ? "text-muted hover:bg-red-50 hover:text-red-700" : "text-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

const icon = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function ReplyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg {...icon} className={className} aria-hidden>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}
export function CopyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg {...icon} className={className} aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}
export function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg {...icon} className={className} aria-hidden>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg {...icon} className="h-3 w-3" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/** Подпись «Ответ Анне» и т. п. для экранного диктора и плашки. */
export function replyLabel(name: string) {
  return format(t.chat.replyTo, { name });
}
