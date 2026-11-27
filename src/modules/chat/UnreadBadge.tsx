"use client";

import { format, t } from "@/lib/i18n";
import { useMyChats } from "./chats";
import { badgeText, totalUnread } from "./logic";

// Общий счётчик непрочитанного на пункте «Сообщения» (боковое меню и нижняя панель).
// Обновляется в реальном времени (общий список чатов, см. chats.ts).
export function UnreadBadge({ className = "" }: { className?: string }) {
  const { chats } = useMyChats();
  const n = chats ? totalUnread(chats) : 0;
  if (n === 0) return null;
  return (
    <span
      role="status"
      aria-label={format(t.messages.unread, { n })}
      className={`pointer-events-none flex h-[18px] min-w-[18px] animate-pop-in items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold leading-none tabular-nums text-white ring-2 ring-white ${className}`}
    >
      {badgeText(n)}
    </span>
  );
}
