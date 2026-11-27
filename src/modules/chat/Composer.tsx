"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { format, t } from "@/lib/i18n";
import type { Author } from "./api";
import { canSend, MAX_BODY, remainingChars, type ChatMessage } from "./logic";
import { replyLabel, ReplyIcon } from "./MessageItem";

/** Поле растёт до ~6 строк, дальше — прокрутка внутри. */
const MAX_LINES = 6;
const LINE_PX = 21;

export type ComposerHandle = { focus: () => void };

// Поле ввода. Enter — отправить, Shift+Enter — новая строка, пустое не отправляется.
// Над полем — плашка ответа с цитатой и крестиком.
export const Composer = forwardRef<
  ComposerHandle,
  {
    replyTo: ChatMessage | null;
    replyAuthor: Author | null | undefined;
    onCancelReply: () => void;
    onSend: (text: string) => void;
  }
>(function Composer({ replyTo, replyAuthor, onCancelReply, onSend }, ref) {
  const c = t.chat;
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => area.current?.focus() }), []);

  // Высота по содержимому.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_LINES * LINE_PX + 18)}px`;
  }, [text]);

  const left = remainingChars(text);
  const ok = canSend(text);

  function submit() {
    if (!ok) return;
    onSend(text);
    setText("");
    area.current?.focus();
  }

  return (
    <div className="shrink-0 border-t border-line bg-white px-3 pb-2.5 pt-2.5 md:px-5">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        {replyTo ? (
          <div className="flex animate-fade-in items-center gap-3 rounded-xl bg-surface py-1.5 pl-3 pr-1.5">
            <ReplyIcon className="h-4 w-4 shrink-0 text-accent" />
            <div className="min-w-0 flex-1 border-l-[3px] border-accent pl-2.5">
              <p className="truncate text-[13px] font-semibold text-accent">{replyLabel(replyAuthor?.name || c.unknownAuthor)}</p>
              <p className="truncate text-[13px] text-muted">{(replyTo.body ?? "").replace(/\s+/g, " ")}</p>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              aria-label={c.cancelReply}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white hover:text-ink"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <div className="relative min-w-0 flex-1">
            <textarea
              ref={area}
              value={text}
              rows={1}
              maxLength={MAX_BODY}
              placeholder={c.placeholder}
              aria-label={c.placeholder}
              enterKeyHint="send"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Enter — отправить; Shift+Enter — новая строка. Во время набора иероглифов/подсказок (IME) не трогаем.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                } else if (e.key === "Escape" && replyTo) {
                  onCancelReply();
                }
              }}
              className={`block w-full resize-none rounded-[22px] border border-transparent bg-surface py-2.5 pl-4 text-base leading-[21px] md:text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-line focus:bg-white ${
                left !== null ? "pr-14" : "pr-4"
              }`}
            />
            {left !== null ? (
              <span
                aria-live="polite"
                aria-label={format(c.charsLeft, { n: left })}
                className={`pointer-events-none absolute bottom-2.5 right-3.5 text-[12px] tabular-nums ${left <= 20 ? "font-semibold text-accent" : "text-muted"}`}
              >
                {left}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={submit}
            // Клавиатура телефона не закрывается после отправки: фокус остаётся в поле.
            onPointerDown={(e) => e.preventDefault()}
            disabled={!ok}
            aria-label={c.send}
            title={c.send}
            className="flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-full bg-accent text-white transition-[background-color,transform,opacity] duration-150 hover:bg-accent-hover active:scale-95 disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 translate-x-px" aria-hidden>
              <path d="M3.4 20.4 21 12 3.4 3.6l-.1 6.5L15 12 3.3 13.9z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});
