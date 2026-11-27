"use client";

// Список чатов пользователя (get_my_chats) — один на вкладку, общий для значка в навигации
// и раздела «Сообщения»: одна подписка Realtime и один счётчик, как в «Работе».
// Обновляется сам: новое сообщение в любом доступном чате (RLS пропускает только их) или
// своя отметка «прочитано» с любого устройства (chat_reads, только свои строки) → перечитать список.
import { useSyncExternalStore } from "react";
import { subscribeLive } from "@/lib/supabase/realtime";
import { loadAuthors, supabase } from "./api";

export type ChatSummary = {
  pageId: string;
  name: string;
  icon: string | null;
  archived: boolean;
  lastAt: string | null;
  lastBody: string | null;
  lastAuthorId: string | null;
  unread: number;
};

type State = { chats: ChatSummary[] | null; failed: boolean };

let state: State = { chats: null, failed: false };
const listeners = new Set<() => void>();
let stopLive: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

async function load() {
  try {
    const { data, error } = await supabase().rpc("get_my_chats");
    if (error) throw error;
    const chats: ChatSummary[] = (data ?? []).map((r) => ({
      pageId: r.page_id,
      name: r.name,
      icon: r.icon ?? null,
      archived: r.status === "archived",
      lastAt: r.last_message_at ?? null,
      lastBody: r.last_message_body ?? null,
      lastAuthorId: r.last_message_author ?? null,
      unread: Number(r.unread_count ?? 0),
    }));
    // Имена авторов последних сообщений — до показа, чтобы строка не «дёргалась».
    await loadAuthors(chats.map((c) => c.lastAuthorId));
    emit({ chats, failed: false });
  } catch {
    emit({ ...state, failed: state.chats === null });
  }
}

/** Перечитать список (несколько событий подряд — один запрос). */
export function refreshChats(delay = 300) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void load();
  }, delay);
}

function start() {
  // Сразу, не дожидаясь Realtime (подключение может занять пару секунд).
  refreshChats(0);
  stopLive = subscribeLive(
    supabase(),
    "my-chats",
    (ch) =>
      ch
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => refreshChats())
        .on("postgres_changes", { event: "*", schema: "public", table: "chat_reads" }, () => refreshChats()),
    () => refreshChats(0),
  );
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  if (!stopLive) start();
  return () => {
    listeners.delete(cb);
    // Переход между страницами снимает и тут же ставит подписчиков — не рвём канал зря.
    if (listeners.size === 0) {
      stopTimer = setTimeout(() => {
        stopTimer = null;
        if (listeners.size === 0 && stopLive) {
          stopLive();
          stopLive = null;
        }
      }, 5000);
    }
  };
}

const empty: State = { chats: null, failed: false };

export function useMyChats(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => empty,
  );
}

/** Чат открыт и прочитан — сразу обнуляем его счётчик, не дожидаясь ответа базы. */
export function markReadLocally(pageId: string) {
  if (!state.chats) return;
  const chat = state.chats.find((c) => c.pageId === pageId);
  if (!chat || chat.unread === 0) return;
  emit({ ...state, chats: state.chats.map((c) => (c.pageId === pageId ? { ...c, unread: 0 } : c)) });
}
