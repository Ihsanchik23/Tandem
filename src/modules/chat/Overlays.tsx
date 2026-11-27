"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { CopyIcon, ReplyIcon, TrashIcon } from "./MessageItem";
import type { ChatMessage } from "./logic";

// Окно поверх чата: на телефоне выезжает снизу, на компьютере — по центру. Escape и тап мимо закрывают.
function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    box.current?.querySelector<HTMLElement>("button[data-autofocus]")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label={t.ui.close} tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/30" />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative w-full animate-sheet-up rounded-t-3xl bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl md:w-[400px] md:animate-pop-in md:rounded-3xl md:p-5"
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-300 md:hidden" />
        {children}
      </div>
    </div>
  );
}

/** Меню сообщения по долгому нажатию (телефон). */
export function ActionMenu({
  message,
  canReply,
  canDelete,
  onReply,
  onCopy,
  onDelete,
  onClose,
}: {
  message: ChatMessage;
  canReply: boolean;
  canDelete: boolean;
  onReply: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const c = t.chat;
  const row = "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base active:bg-surface";
  return (
    <Modal label={c.actions} onClose={onClose}>
      <p className="mb-2 line-clamp-3 break-words rounded-2xl bg-surface px-3.5 py-2.5 text-[14px] text-muted [overflow-wrap:anywhere]">
        {message.body}
      </p>
      <div className="flex flex-col">
        {canReply ? (
          <button type="button" data-autofocus onClick={onReply} className={`${row} text-ink`}>
            <ReplyIcon className="h-5 w-5 text-muted" />
            {c.reply}
          </button>
        ) : null}
        {message.body ? (
          <button type="button" onClick={onCopy} className={`${row} text-ink`}>
            <CopyIcon className="h-5 w-5 text-muted" />
            {c.copy}
          </button>
        ) : null}
        {canDelete ? (
          <button type="button" onClick={onDelete} className={`${row} text-red-700`}>
            <TrashIcon className="h-5 w-5" />
            {c.delete}
          </button>
        ) : null}
      </div>
    </Modal>
  );
}

/** Подтверждение удаления. */
export function ConfirmDelete({ onConfirm, onClose }: { onConfirm: () => Promise<void>; onClose: () => void }) {
  const c = t.chat;
  const [busy, setBusy] = useState(false);
  return (
    <Modal label={c.deleteTitle} onClose={onClose}>
      <h2 className="text-lg font-semibold text-ink">{c.deleteTitle}</h2>
      <p className="mt-1.5 text-[15px] text-muted">{c.deleteText}</p>
      <div className="mt-5 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-xl border border-line px-4 text-base font-medium text-ink hover:bg-surface"
        >
          {c.cancel}
        </button>
        <button
          type="button"
          data-autofocus
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm();
            setBusy(false);
          }}
          className="h-11 rounded-xl bg-red-700 px-4 text-base font-medium text-white hover:bg-red-800 disabled:opacity-60"
        >
          {c.deleteYes}
        </button>
      </div>
    </Modal>
  );
}
