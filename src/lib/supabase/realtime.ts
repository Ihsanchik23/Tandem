"use client";

// Надёжная подписка Realtime (postgres_changes) для экранов: задачи, комментарии, позже чат.
//
// Почему не просто channel().subscribe():
// 1. Канал, созданный сразу при загрузке страницы, мог войти в Realtime БЕЗ токена пользователя:
//    токен входа читается из cookies асинхронно, а канал берёт тот, что уже есть в момент subscribe().
//    Вошедший как аноним канал проходит RLS как аноним — события не приходят никогда, хотя ошибки нет.
//    Поэтому сначала дожидаемся токена (realtime.setAuth()), потом подписываемся.
// 2. После сна ноутбука, ухода во фоновую вкладку (Safari усыпляет её особенно агрессивно)
//    или потери сети соединение рвётся; события за это время пропадают. Поэтому после каждого
//    (пере)подключения и при возврате на вкладку вызываем onSync — экран дочитывает данные.
// 3. Ошибка или таймаут подписки — пересоздаём канал с нарастающей паузой.
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

let seq = 0;

export function subscribeLive(
  client: SupabaseClient,
  name: string,
  setup: (channel: RealtimeChannel) => RealtimeChannel,
  onSync: () => void,
): () => void {
  let stopped = false;
  let channel: RealtimeChannel | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  function drop() {
    if (channel) client.removeChannel(channel);
    channel = null;
  }

  function restart() {
    drop();
    if (stopped || retry) return;
    const delay = Math.min(1000 * 2 ** attempt, 30_000);
    attempt += 1;
    retry = setTimeout(() => {
      retry = null;
      void start();
    }, delay);
  }

  async function start() {
    try {
      // Токен пользователя — до входа в канал (иначе канал пройдёт RLS как аноним).
      await client.realtime.setAuth();
    } catch {
      // Без токена RLS ничего не отдаст — попробуем позже.
      return restart();
    }
    if (stopped) return;
    // Уникальное имя: старый канал с тем же именем мог ещё не закрыться.
    const ch = setup(client.channel(`${name}#${++seq}`));
    channel = ch;
    ch.subscribe((status) => {
      if (stopped || channel !== ch) return;
      if (status === "SUBSCRIBED") {
        // Первое подключение и каждое переподключение: дочитать то, что могли пропустить.
        attempt = 0;
        onSync();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        restart();
      }
    });
  }

  // Вернулись на вкладку, ноутбук проснулся, появилась сеть — дочитать и проверить канал.
  function wake() {
    if (stopped || document.visibilityState !== "visible") return;
    onSync();
    if (channel && channel.state !== "joined" && channel.state !== "joining") restart();
  }

  void start();
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("online", wake);
  window.addEventListener("pageshow", wake);

  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    drop();
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("online", wake);
    window.removeEventListener("pageshow", wake);
  };
}
