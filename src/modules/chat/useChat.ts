"use client";

// Состояние одного чата: лента, история, отправка, удаление, прочтение, доступ.
// Realtime — только через subscribeLive (lib/supabase/realtime.ts): подписка с токеном пользователя,
// дочитывание после переподключения и при возврате на вкладку.
import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeLive } from "@/lib/supabase/realtime";
import {
  deleteMessage,
  fetchByIds,
  fetchChatStatus,
  fetchMessages,
  fetchNewer,
  fetchRange,
  loadAuthors,
  markChatRead,
  sendMessage,
  supabase,
  type ChatStatus,
  type Result,
} from "./api";
import { markReadLocally, refreshChats } from "./chats";
import {
  cleanBody,
  fromRow,
  isAccessLost,
  mergeMessages,
  newClientId,
  newestSent,
  oldestSent,
  PAGE_SIZE,
  type ChatErrorKey,
  type ChatMessage,
  type MessageRow,
} from "./logic";

/** Не чаще раза в 2 секунды (последний вызов не теряется). */
const READ_EVERY_MS = 2000;

export type LoadState = "loading" | "ready" | "failed";

export function useChat({ pageId, me, archived }: { pageId: string; me: string; archived: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quotes, setQuotes] = useState<ReadonlyMap<string, ChatMessage>>(new Map());
  const [load, setLoad] = useState<LoadState>("loading");
  const [status, setStatus] = useState<ChatStatus>(archived ? "archived" : "active");
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [notice, setNotice] = useState<ChatErrorKey | null>(null);
  // Профили авторов пришли — перерисовать имена и аватары.
  const [, setAuthorsVersion] = useState(0);

  const list = useRef<ChatMessage[]>([]);
  const quoteIds = useRef(new Set<string>());
  const stopLive = useRef<(() => void) | null>(null);
  const statusRef = useRef(status);

  // Всё, что пришло (история, Realtime, ответ RPC) — через слияние без дублей по client_id.
  const apply = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    list.current = mergeMessages(list.current, incoming);
    setMessages(list.current);
    // Оригинал цитаты удалили или он пришёл — обновить и плашку цитаты.
    const quoted = incoming.filter((m) => m.id && quoteIds.current.has(m.id));
    if (quoted.length) {
      setQuotes((prev) => {
        const next = new Map(prev);
        for (const m of quoted) next.set(m.id!, m);
        return next;
      });
    }
    void loadAuthors(incoming.map((m) => m.authorId)).then((added) => added && setAuthorsVersion((v) => v + 1));
  }, []);

  const replace = useCallback((fn: (list: ChatMessage[]) => ChatMessage[]) => {
    list.current = fn(list.current);
    setMessages(list.current);
  }, []);

  const lose = useCallback(() => {
    statusRef.current = "no_access";
    setStatus("no_access");
    // Доступа нет — события больше не нужны (RLS их и так не пропустит).
    stopLive.current?.();
    stopLive.current = null;
    refreshChats(0);
  }, []);

  const recheck = useCallback(async () => {
    const res = await fetchChatStatus(pageId);
    if (!res.ok) return;
    if (res.value === "no_access") return lose();
    statusRef.current = res.value;
    setStatus(res.value);
  }, [pageId, lose]);

  // ---------- Прочтение ----------
  const lastRead = useRef(0);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markRead = useCallback(() => {
    if (statusRef.current === "no_access" || document.visibilityState !== "visible") return;
    markReadLocally(pageId);
    if (readTimer.current) return;
    const wait = Math.max(0, lastRead.current + READ_EVERY_MS - Date.now());
    readTimer.current = setTimeout(() => {
      readTimer.current = null;
      lastRead.current = Date.now();
      void markChatRead(pageId).then((res) => {
        if (!res.ok && isAccessLost(res.error)) void recheck();
      });
    }, wait);
  }, [pageId, recheck]);

  // ---------- Загрузка и Realtime ----------
  useEffect(() => {
    let alive = true;
    list.current = [];
    quoteIds.current = new Set();
    statusRef.current = archived ? "archived" : "active";

    async function first() {
      const res = await fetchMessages(pageId);
      if (!alive) return;
      if (!res.ok) {
        if (isAccessLost(res.error)) return lose();
        setLoad((s) => (s === "ready" ? s : "failed"));
        return;
      }
      setHasMore(res.value.length === PAGE_SIZE);
      await loadAuthors(res.value.map((m) => m.authorId));
      if (!alive) return;
      apply(res.value);
      setLoad("ready");
    }

    // После (пере)подключения и возврата на вкладку: проверить доступ и дочитать пропущенное.
    async function sync() {
      const st = await fetchChatStatus(pageId);
      if (!alive) return;
      if (st.ok) {
        if (st.value === "no_access") return lose();
        statusRef.current = st.value;
        setStatus(st.value);
      }
      const newest = newestSent(list.current);
      if (!newest) return first();
      const [newer, latest] = await Promise.all([fetchNewer(pageId, newest.createdAt), fetchMessages(pageId)]);
      if (!alive) return;
      // Последние 50 — чтобы увидеть и удаления, случившиеся без нас.
      if (latest.ok) apply(latest.value);
      if (newer.ok) apply(newer.value);
      setLoad("ready");
    }

    void first();
    stopLive.current = subscribeLive(
      supabase(),
      `chat:${pageId}`,
      (ch) =>
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages", filter: `page_id=eq.${pageId}` },
          (payload) => {
            const row = payload.new as Partial<MessageRow> | undefined;
            if (!alive || !row?.id || !row.client_id) return;
            apply([fromRow(row as MessageRow)]);
          },
        ),
      () => void sync(),
    );
    return () => {
      alive = false;
      stopLive.current?.();
      stopLive.current = null;
      if (readTimer.current) clearTimeout(readTimer.current);
      readTimer.current = null;
      list.current = [];
      setMessages([]);
      setQuotes(new Map());
      setLoad("loading");
      setHasMore(true);
      setNotice(null);
    };
    // archived — только начальное значение; дальше статус узнаём у базы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, apply, lose]);

  // Оригиналы цитат, которых нет в загруженной части ленты.
  useEffect(() => {
    const loaded = new Set(messages.map((m) => m.id));
    const need = [...new Set(messages.map((m) => m.replyToId))].filter(
      (id): id is string => !!id && !loaded.has(id) && !quoteIds.current.has(id),
    );
    if (need.length === 0) return;
    need.forEach((id) => quoteIds.current.add(id));
    void fetchByIds(need).then((res) => {
      if (!res.ok) {
        need.forEach((id) => quoteIds.current.delete(id));
        return;
      }
      void loadAuthors(res.value.map((m) => m.authorId)).then((added) => added && setAuthorsVersion((v) => v + 1));
      setQuotes((prev) => {
        const next = new Map(prev);
        for (const m of res.value) next.set(m.id!, m);
        return next;
      });
    });
  }, [messages]);

  // ---------- История ----------
  const olderBusy = useRef(false);
  const loadOlder = useCallback(async () => {
    const oldest = oldestSent(list.current);
    if (!oldest || olderBusy.current || !hasMore) return;
    olderBusy.current = true;
    setLoadingOlder(true);
    const res = await fetchMessages(pageId, oldest.createdAt);
    olderBusy.current = false;
    setLoadingOlder(false);
    if (!res.ok) return;
    await loadAuthors(res.value.map((m) => m.authorId));
    setHasMore(res.value.length === PAGE_SIZE);
    apply(res.value);
  }, [pageId, hasMore, apply]);

  /** Догрузить историю до сообщения id (переход по цитате). true — оно теперь в ленте. */
  const ensureLoaded = useCallback(
    async (id: string): Promise<boolean> => {
      if (list.current.some((m) => m.id === id)) return true;
      let target = quotes.get(id) ?? null;
      if (!target) {
        const got = await fetchByIds([id]);
        target = got.ok ? (got.value[0] ?? null) : null;
      }
      const oldest = oldestSent(list.current);
      if (!target || !oldest) return false;
      const res = await fetchRange(pageId, target.createdAt, oldest.createdAt);
      if (!res.ok) return false;
      await loadAuthors(res.value.map((m) => m.authorId));
      apply(res.value);
      return list.current.some((m) => m.id === id);
    },
    [pageId, quotes, apply],
  );

  // ---------- Отправка ----------
  const deliver = useCallback(
    async (m: ChatMessage) => {
      const res = await sendMessage(pageId, m);
      if (res.ok) {
        // Время сервера и окончательный вид — из базы (обычно Realtime успевает раньше).
        const got = await fetchByIds([res.value]);
        apply(got.ok && got.value.length ? got.value : [{ ...m, id: res.value, state: "sent" }]);
        return;
      }
      apply([{ ...m, state: "failed", error: res.error }]);
      if (res.error === "rateLimited") setNotice("rateLimited");
      if (isAccessLost(res.error)) void recheck();
    },
    [pageId, apply, recheck],
  );

  const send = useCallback(
    (text: string, replyToId: string | null) => {
      const body = cleanBody(text);
      if (!body || statusRef.current !== "active") return;
      const m: ChatMessage = {
        id: null,
        clientId: newClientId(),
        authorId: me,
        body,
        replyToId,
        createdAt: new Date().toISOString(),
        deletedAt: null,
        state: "sending",
      };
      setNotice(null);
      apply([m]);
      void deliver(m);
    },
    [me, apply, deliver],
  );

  /** Повтор с тем же client_id — база вернёт уже созданное, дубля не будет. */
  const retry = useCallback(
    (clientId: string) => {
      const m = list.current.find((x) => x.clientId === clientId);
      if (!m || m.state !== "failed") return;
      const next: ChatMessage = { ...m, state: "sending", error: undefined };
      apply([next]);
      void deliver(next);
    },
    [apply, deliver],
  );

  const discard = useCallback(
    (clientId: string) => replace((l) => l.filter((x) => x.clientId !== clientId || x.state === "sent")),
    [replace],
  );

  // ---------- Удаление ----------
  const remove = useCallback(
    async (m: ChatMessage): Promise<Result> => {
      if (!m.id) {
        discard(m.clientId);
        return { ok: true, value: undefined };
      }
      const id = m.id;
      const now = new Date().toISOString();
      replace((l) => l.map((x) => (x.id === id ? { ...x, deletedAt: now, body: null } : x)));
      const res = await deleteMessage(id);
      if (!res.ok) {
        replace((l) => l.map((x) => (x.id === id ? m : x)));
        if (isAccessLost(res.error)) void recheck();
      }
      return res;
    },
    [discard, replace, recheck],
  );

  return {
    messages,
    quotes,
    load,
    status,
    hasMore,
    loadingOlder,
    notice,
    setNotice,
    loadOlder,
    ensureLoaded,
    send,
    retry,
    discard,
    remove,
    markRead,
  };
}

export type ChatController = ReturnType<typeof useChat>;
