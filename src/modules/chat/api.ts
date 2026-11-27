"use client";

// Данные чата. Чтение — select (RLS отдаёт только доступные страницы), изменения — RPC.
// Права проверяет база; здесь — запросы, кэш профилей и перевод ошибок.
import { createClient } from "@/lib/supabase/client";
import { chatDbError, fromRow, PAGE_SIZE, type ChatErrorKey, type ChatMessage, type MessageRow } from "./logic";

let client: ReturnType<typeof createClient> | null = null;
export function supabase() {
  client ??= createClient();
  return client;
}

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: ChatErrorKey };

const COLUMNS = "id, client_id, author_id, body, reply_to_id, created_at, deleted_at";
/** Запрос без ответа дольше — считаем, что связи нет (повтор с тем же client_id безопасен). */
const TIMEOUT_MS = 15_000;

type Response = { data: unknown; error: { code?: string; message?: string } | null };

async function run<T>(fn: (signal: AbortSignal) => PromiseLike<Response>): Promise<Result<T>> {
  try {
    const { data, error } = await fn(AbortSignal.timeout(TIMEOUT_MS));
    if (error) return { ok: false, error: chatDbError(error) };
    return { ok: true, value: data as T };
  } catch {
    return { ok: false, error: "network" };
  }
}

const toMessages = (rows: unknown) => ((rows as MessageRow[] | null) ?? []).map(fromRow);

// ---------- История ----------

/** Последние 50 (или 50 до сообщения before). Возвращает по возрастанию времени. */
export async function fetchMessages(pageId: string, before?: string): Promise<Result<ChatMessage[]>> {
  const res = await run<MessageRow[]>((signal) => {
    let q = supabase().from("messages").select(COLUMNS).eq("page_id", pageId);
    if (before) q = q.lt("created_at", before);
    return q.order("created_at", { ascending: false }).limit(PAGE_SIZE).abortSignal(signal);
  });
  return res.ok ? { ok: true, value: toMessages(res.value).reverse() } : res;
}

/** Всё новее after (дочитать пропущенное после переподключения). */
export async function fetchNewer(pageId: string, after: string): Promise<Result<ChatMessage[]>> {
  const res = await run<MessageRow[]>((signal) =>
    supabase()
      .from("messages")
      .select(COLUMNS)
      .eq("page_id", pageId)
      .gt("created_at", after)
      .order("created_at", { ascending: true })
      .limit(500)
      .abortSignal(signal),
  );
  return res.ok ? { ok: true, value: toMessages(res.value) } : res;
}

/** История от сообщения target до before включительно (переход к цитате, которая ещё не подгружена). */
export async function fetchRange(pageId: string, fromIso: string, before: string): Promise<Result<ChatMessage[]>> {
  const res = await run<MessageRow[]>((signal) =>
    supabase()
      .from("messages")
      .select(COLUMNS)
      .eq("page_id", pageId)
      .gte("created_at", fromIso)
      .lt("created_at", before)
      .order("created_at", { ascending: true })
      .limit(2000)
      .abortSignal(signal),
  );
  return res.ok ? { ok: true, value: toMessages(res.value) } : res;
}

/** Отдельные сообщения по id (оригиналы цитат, своё только что отправленное). */
export async function fetchByIds(ids: string[]): Promise<Result<ChatMessage[]>> {
  if (ids.length === 0) return { ok: true, value: [] };
  const res = await run<MessageRow[]>((signal) => supabase().from("messages").select(COLUMNS).in("id", ids).abortSignal(signal));
  return res.ok ? { ok: true, value: toMessages(res.value) } : res;
}

// ---------- Страница: доступ и архив ----------

export type ChatStatus = "active" | "archived" | "no_access";

/** Проверка после (пере)подключения: доступ мог пропасть, страницу могли отправить в архив. */
export async function fetchChatStatus(pageId: string): Promise<Result<ChatStatus>> {
  const access = await run<boolean>((signal) => supabase().rpc("can_access_page", { p_page: pageId }).abortSignal(signal));
  if (!access.ok) return access;
  if (!access.value) return { ok: true, value: "no_access" };
  const page = await run<{ status: string; module_key: string } | null>((signal) =>
    supabase().from("pages").select("status, module_key").eq("id", pageId).abortSignal(signal).maybeSingle(),
  );
  if (!page.ok) return page;
  if (!page.value || page.value.module_key !== "chat") return { ok: true, value: "no_access" };
  return { ok: true, value: page.value.status === "archived" ? "archived" : "active" };
}

// ---------- Изменения ----------

export function sendMessage(pageId: string, m: Pick<ChatMessage, "clientId" | "body" | "replyToId">) {
  return run<string>((signal) =>
    supabase()
      .rpc("send_message", {
        p_page: pageId,
        p_client_id: m.clientId,
        p_body: m.body ?? "",
        ...(m.replyToId ? { p_reply_to: m.replyToId } : {}),
      })
      .abortSignal(signal),
  );
}

export function deleteMessage(id: string) {
  return run<undefined>((signal) => supabase().rpc("delete_message", { p_message: id }).abortSignal(signal));
}

export function markChatRead(pageId: string) {
  return run<undefined>((signal) => supabase().rpc("mark_chat_read", { p_page: pageId }).abortSignal(signal));
}

// ---------- Профили авторов (общий кэш для ленты и списка чатов) ----------

export type Author = { name: string; avatarUrl: string | null; username: string | null };

const authors = new Map<string, Author | null>();
const loading = new Map<string, Promise<void>>();

function personName(p: { first_name: string | null; last_name: string | null; username: string | null }): string {
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || (p.username ? `@${p.username}` : "");
}

export function cachedAuthor(id: string | null): Author | null | undefined {
  return id ? authors.get(id) : null;
}

/** Догрузить профили, которых ещё нет в кэше. Возвращает true, если что-то добавилось. */
export async function loadAuthors(ids: readonly (string | null)[]): Promise<boolean> {
  const missing = [...new Set(ids.filter((x): x is string => !!x && !authors.has(x) && !loading.has(x)))];
  const waiting = [...new Set(ids.filter((x): x is string => !!x && loading.has(x)))].map((x) => loading.get(x)!);
  if (missing.length === 0) {
    await Promise.all(waiting);
    return false;
  }
  const job = (async () => {
    const { data } = await supabase()
      .from("profiles")
      .select("id, first_name, last_name, username, avatar_url")
      .in("id", missing);
    for (const p of data ?? []) {
      authors.set(p.id, { name: personName(p), avatarUrl: p.avatar_url ?? null, username: p.username ?? null });
    }
    // Профиля нет (аккаунт удалён) — запоминаем, чтобы не спрашивать снова.
    for (const id of missing) if (!authors.has(id)) authors.set(id, null);
  })().catch(() => {
    // Сеть — попробуем при следующем сообщении.
  });
  for (const id of missing) loading.set(id, job);
  await Promise.all([job, ...waiting]);
  for (const id of missing) loading.delete(id);
  return true;
}
