// Чистая логика чата (без React и Supabase) — проверяется unit-тестами (logic.test.ts).
// Слияние оптимистичных сообщений с пришедшими из Realtime и истории, группировка ленты,
// подписи дат и времени, ссылки в тексте, превью в списке чатов.

export const MAX_BODY = 4000;
/** С какого остатка символов показывать счётчик у поля ввода. */
export const COUNTER_FROM = 200;
/** Сообщения одного автора с паузой больше этой — новая группа (снова аватар и имя). */
export const GROUP_GAP_MS = 5 * 60_000;
export const PAGE_SIZE = 50;

export type SendState = "sent" | "sending" | "failed";

export type ChatMessage = {
  /** null — сервер ещё не подтвердил (оптимистичное сообщение). */
  id: string | null;
  /** Создаётся на клиенте один раз на сообщение; по нему склеиваем оптимистичное и серверное. */
  clientId: string;
  authorId: string | null;
  body: string | null;
  replyToId: string | null;
  createdAt: string;
  deletedAt: string | null;
  state: SendState;
  /** Код ошибки отправки (ключ i18n), только для state = "failed". */
  error?: string;
};

/** Строка таблицы messages (select и Realtime). */
export type MessageRow = {
  id: string;
  client_id: string;
  author_id: string | null;
  body: string | null;
  reply_to_id: string | null;
  created_at: string;
  deleted_at: string | null;
};

export function fromRow(r: MessageRow): ChatMessage {
  return {
    id: r.id,
    clientId: r.client_id,
    authorId: r.author_id,
    body: r.body,
    replyToId: r.reply_to_id,
    createdAt: r.created_at,
    deletedAt: r.deleted_at,
    state: "sent",
  };
}

// ---------- Слияние ----------

/**
 * Добавить или обновить сообщения в ленте без дублей.
 * Ключ — client_id (уникален в базе): серверная версия заменяет оптимистичную, а не добавляется второй.
 * Серверные сообщения идут по времени сервера; ещё не подтверждённые — в конце, в порядке отправки
 * (часы телефона могут отставать, и своё сообщение не должно «прыгать» вверх).
 */
export function mergeMessages(list: readonly ChatMessage[], incoming: readonly ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return list as ChatMessage[];
  const byClient = new Map<string, ChatMessage>();
  for (const m of list) byClient.set(m.clientId, m);
  for (const m of incoming) {
    const prev = byClient.get(m.clientId);
    if (!prev) {
      byClient.set(m.clientId, m);
      continue;
    }
    if (m.state === "sent") {
      // Удалённое не «оживает» от старой копии (история дочиталась раньше события удаления).
      const deletedAt = m.deletedAt ?? prev.deletedAt;
      byClient.set(m.clientId, { ...m, deletedAt, body: deletedAt ? null : m.body });
    } else if (prev.state !== "sent") {
      // Локальная смена состояния (отправляется → не отправлено → повтор).
      byClient.set(m.clientId, m);
    }
    // Иначе: локальная копия устарела — сервер уже подтвердил, оставляем серверную.
  }
  return sortMessages([...byClient.values()]);
}

export function sortMessages(list: ChatMessage[]): ChatMessage[] {
  const sent = list.filter((m) => m.state === "sent");
  const pending = list.filter((m) => m.state !== "sent");
  sent.sort((a, b) => (a.createdAt === b.createdAt ? (a.id ?? "").localeCompare(b.id ?? "") : a.createdAt < b.createdAt ? -1 : 1));
  pending.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  return [...sent, ...pending];
}

/** Самое старое подтверждённое сообщение — от него грузим историю назад. */
export function oldestSent(list: readonly ChatMessage[]): ChatMessage | null {
  return list.find((m) => m.state === "sent") ?? null;
}
/** Самое новое подтверждённое — после переподключения дочитываем всё, что новее. */
export function newestSent(list: readonly ChatMessage[]): ChatMessage | null {
  for (let i = list.length - 1; i >= 0; i--) if (list[i]!.state === "sent") return list[i]!;
  return null;
}

export function isDeleted(m: Pick<ChatMessage, "deletedAt">): boolean {
  return m.deletedAt !== null;
}

/** Кнопка «Удалить» (права всё равно проверяет delete_message). */
export function canDeleteMessage(m: Pick<ChatMessage, "authorId" | "deletedAt">, me: string, role: string | null): boolean {
  if (m.deletedAt) return false;
  return m.authorId === me || role === "owner" || role === "admin" || role === "manager";
}

// ---------- Поле ввода ----------

export function cleanBody(text: string): string {
  return text.trim();
}
export function canSend(text: string): boolean {
  const body = cleanBody(text);
  return body.length > 0 && body.length <= MAX_BODY;
}
/** Сколько символов осталось — или null, пока счётчик не нужен. */
export function remainingChars(text: string): number | null {
  const left = MAX_BODY - text.length;
  return left <= COUNTER_FROM ? left : null;
}

// ---------- Даты ----------

/** Ключ дня в часовом поясе устройства: 2026-11-27. */
export function dayKey(iso: string | number | Date): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysBetween(fromKey: string, toKey: string): number {
  const [y1, m1, d1] = fromKey.split("-").map(Number) as [number, number, number];
  const [y2, m2, d2] = toKey.split("-").map(Number) as [number, number, number];
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const dayMonthYear = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
const shortDate = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const shortDateYear = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
const hm = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });

export type DayWords = { today: string; yesterday: string };

/** Разделитель в ленте: «Сегодня», «Вчера», «25 ноября», «25 ноября 2025 г.». */
export function dayLabel(iso: string, now: number, words: DayWords): string {
  const diff = daysBetween(dayKey(iso), dayKey(now));
  if (diff === 0) return words.today;
  if (diff === 1) return words.yesterday;
  const d = new Date(iso);
  return d.getFullYear() === new Date(now).getFullYear() ? dayMonth.format(d) : dayMonthYear.format(d);
}

/** Время в списке чатов: сегодня — «14:05», вчера — «Вчера», в этом году — «25 нояб.», раньше — «25.11.25». */
export function listTime(iso: string, now: number, words: DayWords): string {
  const diff = daysBetween(dayKey(iso), dayKey(now));
  if (diff === 0) return timeOf(iso);
  if (diff === 1) return words.yesterday;
  const d = new Date(iso);
  return d.getFullYear() === new Date(now).getFullYear() ? shortDate.format(d) : shortDateYear.format(d);
}

export function timeOf(iso: string): string {
  return hm.format(new Date(iso));
}

// ---------- Группировка ленты ----------

export type FeedItem =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "message";
      key: string;
      message: ChatMessage;
      /** Первое в группе: показываем имя (и аватар). */
      first: boolean;
      /** Последнее в группе: у него «хвостик» пузыря и аватар (у чужих). */
      last: boolean;
    };

/** Лента: разделители по дням и группы подряд идущих сообщений одного автора. */
export function buildFeed(list: readonly ChatMessage[], now: number, words: DayWords): FeedItem[] {
  const out: FeedItem[] = [];
  let prev: ChatMessage | null = null;
  let prevDay = "";
  for (const m of list) {
    const day = dayKey(m.createdAt);
    if (day !== prevDay) {
      out.push({ kind: "day", key: `day:${day}`, label: dayLabel(m.createdAt, now, words) });
      prevDay = day;
      prev = null;
    }
    const continues =
      prev !== null &&
      prev.authorId === m.authorId &&
      Date.parse(m.createdAt) - Date.parse(prev.createdAt) <= GROUP_GAP_MS;
    if (!continues && out.length) {
      const last = out[out.length - 1]!;
      if (last.kind === "message") last.last = true;
    }
    out.push({ kind: "message", key: m.clientId, message: m, first: !continues, last: false });
    prev = m;
  }
  const tail = out[out.length - 1];
  if (tail?.kind === "message") tail.last = true;
  return out;
}

// ---------- Ссылки ----------

export type TextPart = { kind: "text"; text: string } | { kind: "link"; text: string; href: string };

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"«»]+/gi;
// Знаки в конце, которые обычно относятся к предложению, а не к ссылке.
const TRAILING = /[.,!?:;'"”’)\]}…]+$/;

/** Разбить текст на части; ссылки — только http(s), без превью. */
export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    let url = match[0];
    const start = match.index;
    // Закрывающую скобку оставляем, если в ссылке есть открывающая (вики-ссылки).
    const trail = url.match(TRAILING)?.[0] ?? "";
    if (trail) {
      let keep = "";
      if (trail.startsWith(")") && url.includes("(")) keep = ")";
      url = url.slice(0, url.length - trail.length) + keep;
    }
    if (url.length <= "www.".length) continue;
    if (start > last) parts.push({ kind: "text", text: text.slice(last, start) });
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    parts.push({ kind: "link", text: url, href });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

// ---------- Список чатов ----------

/** Значок счётчика: больше 99 — «99+». */
export function badgeText(n: number): string {
  return n > 99 ? "99+" : String(n);
}

export type PreviewWords = { you: string; deleted: string; empty: string };

/** Последнее сообщение в строке списка: «Вы: …», «Анна: …», «Сообщение удалено». */
export function chatPreview(
  last: { at: string | null; body: string | null; authorId: string | null },
  me: string,
  authorName: string | null,
  words: PreviewWords,
): string {
  if (!last.at) return words.empty;
  const body = last.body === null ? words.deleted : last.body.replace(/\s+/g, " ").trim();
  if (last.authorId === me) return `${words.you}: ${body}`;
  return authorName ? `${authorName}: ${body}` : body;
}

/** Сумма непрочитанного для значка в навигации. */
export function totalUnread(chats: readonly { unread: number }[]): number {
  return chats.reduce((sum, c) => sum + c.unread, 0);
}

// ---------- Ошибки ----------

/** Код ошибки базы → ключ текста (ru.ts, блок chat.errors). */
export type ChatErrorKey =
  | "network"
  | "rateLimited"
  | "pageUnavailable"
  | "forbidden"
  | "replyMissing"
  | "tooLong"
  | "sessionExpired"
  | "generic";

export function chatDbError(error: { code?: string | null; message?: string | null }): ChatErrorKey {
  const m = error.message ?? "";
  if (m === "rate_limited") return "rateLimited";
  if (m === "page_unavailable") return "pageUnavailable";
  if (m === "forbidden") return "forbidden";
  if (m === "not_found") return "replyMissing";
  if (m === "not_authenticated" || error.code === "PGRST301") return "sessionExpired";
  if (error.code === "23514") return "tooLong";
  if (/fetch|network|abort|timeout|load failed/i.test(m)) return "network";
  return "generic";
}

/** Потеря доступа: дальше читать и писать нельзя — показываем экран «Нет доступа». */
export function isAccessLost(key: ChatErrorKey): boolean {
  return key === "pageUnavailable" || key === "forbidden";
}

/** UUID v4 для client_id. crypto.randomUUID есть только на https/localhost — иначе собираем сами. */
export function newClientId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
