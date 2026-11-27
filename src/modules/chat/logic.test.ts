import { test } from "node:test";
import assert from "node:assert/strict";
import {
  badgeText,
  buildFeed,
  canDeleteMessage,
  canSend,
  chatDbError,
  chatPreview,
  dayLabel,
  linkify,
  listTime,
  mergeMessages,
  newClientId,
  newestSent,
  oldestSent,
  remainingChars,
  totalUnread,
  type ChatMessage,
} from "./logic.ts";

const WORDS = { today: "Сегодня", yesterday: "Вчера" };
// Местное время устройства — тесты не зависят от часового пояса машины.
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString();
const NOW = new Date(2026, 10, 27, 15, 0).getTime();

function msg(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "m1",
    clientId: "c1",
    authorId: "u1",
    body: "Привет",
    replyToId: null,
    createdAt: at(27, 10),
    deletedAt: null,
    state: "sent",
    ...over,
  };
}

// ---------- Слияние без дублей ----------

test("Realtime с тем же client_id заменяет оптимистичное сообщение, а не добавляет второе", () => {
  const optimistic = msg({ id: null, state: "sending", createdAt: at(27, 12, 1) });
  const fromServer = msg({ id: "srv", createdAt: at(27, 12, 0) });
  const list = mergeMessages([optimistic], [fromServer]);
  assert.equal(list.length, 1);
  assert.equal(list[0]!.id, "srv");
  assert.equal(list[0]!.state, "sent");
});

test("событие Realtime раньше ответа RPC: поздний локальный статус не откатывает серверную версию", () => {
  const server = msg({ id: "srv" });
  const list = mergeMessages([server], [msg({ id: null, state: "sending" })]);
  assert.equal(list.length, 1);
  assert.equal(list[0]!.state, "sent");
  assert.equal(list[0]!.id, "srv");
});

test("повтор после ошибки: тот же client_id, одно сообщение", () => {
  let list = mergeMessages([], [msg({ id: null, state: "sending" })]);
  list = mergeMessages(list, [{ ...list[0]!, state: "failed", error: "network" }]);
  assert.equal(list[0]!.state, "failed");
  list = mergeMessages(list, [{ ...list[0]!, state: "sending", error: undefined }]);
  list = mergeMessages(list, [msg({ id: "srv" })]);
  // То же сообщение пришло ещё раз (дочитывание после переподключения).
  list = mergeMessages(list, [msg({ id: "srv" })]);
  assert.equal(list.length, 1);
  assert.equal(list[0]!.state, "sent");
});

test("история и Realtime пересекаются — дублей нет, порядок по времени сервера", () => {
  const a = msg({ id: "a", clientId: "ca", createdAt: at(27, 9) });
  const b = msg({ id: "b", clientId: "cb", createdAt: at(27, 10) });
  const c = msg({ id: "c", clientId: "cc", createdAt: at(27, 11) });
  const list = mergeMessages([b, c], [a, b, c]);
  assert.deepEqual(list.map((m) => m.id), ["a", "b", "c"]);
});

test("неотправленные сообщения всегда внизу, даже если часы телефона отстают", () => {
  const pending = msg({ id: null, clientId: "p", state: "sending", createdAt: at(27, 8) });
  const server = msg({ id: "s", clientId: "s", createdAt: at(27, 11) });
  const list = mergeMessages([pending], [server]);
  assert.deepEqual(list.map((m) => m.clientId), ["s", "p"]);
});

test("удалённое не «оживает», если старая копия пришла после события удаления", () => {
  const deleted = msg({ body: null, deletedAt: at(27, 12) });
  const stale = msg();
  const list = mergeMessages([deleted], [stale]);
  assert.equal(list[0]!.deletedAt, deleted.deletedAt);
  assert.equal(list[0]!.body, null);
});

test("пустой incoming — тот же список", () => {
  const list = [msg()];
  assert.equal(mergeMessages(list, []), list);
});

test("oldestSent / newestSent пропускают неотправленные", () => {
  const list = mergeMessages([], [
    msg({ id: "a", clientId: "a", createdAt: at(27, 9) }),
    msg({ id: "b", clientId: "b", createdAt: at(27, 10) }),
    msg({ id: null, clientId: "p", state: "failed", createdAt: at(27, 11) }),
  ]);
  assert.equal(oldestSent(list)?.id, "a");
  assert.equal(newestSent(list)?.id, "b");
});

// ---------- Группировка ----------

test("подряд идущие сообщения одного автора — одна группа, имя один раз", () => {
  const list = [
    msg({ clientId: "1", createdAt: at(27, 10, 0) }),
    msg({ clientId: "2", createdAt: at(27, 10, 2) }),
    msg({ clientId: "3", authorId: "u2", createdAt: at(27, 10, 3) }),
    msg({ clientId: "4", createdAt: at(27, 10, 4) }),
  ];
  const feed = buildFeed(list, NOW, WORDS);
  assert.equal(feed[0]!.kind, "day");
  const msgs = feed.filter((f) => f.kind === "message");
  assert.deepEqual(
    msgs.map((f) => [f.key, f.first, f.last]),
    [
      ["1", true, false],
      ["2", false, true],
      ["3", true, true],
      ["4", true, true],
    ],
  );
});

test("пауза больше 5 минут начинает новую группу", () => {
  const feed = buildFeed(
    [msg({ clientId: "1", createdAt: at(27, 10, 0) }), msg({ clientId: "2", createdAt: at(27, 10, 6) })],
    NOW,
    WORDS,
  );
  const msgs = feed.filter((f) => f.kind === "message");
  assert.equal(msgs[1]!.first, true);
  assert.equal(msgs[0]!.last, true);
});

test("разделители по дням: «Вчера», «Сегодня»; группа не переходит через полночь", () => {
  const feed = buildFeed(
    [msg({ clientId: "1", createdAt: at(26, 23, 58) }), msg({ clientId: "2", createdAt: at(27, 0, 1) })],
    NOW,
    WORDS,
  );
  assert.deepEqual(
    feed.map((f) => (f.kind === "day" ? f.label : `${f.key}:${f.first}`)),
    ["Вчера", "1:true", "Сегодня", "2:true"],
  );
});

test("dayLabel: дата словами для давних дней", () => {
  assert.equal(dayLabel(at(20, 10), NOW, WORDS), "20 ноября");
  assert.match(dayLabel(new Date(2025, 0, 5, 10).toISOString(), NOW, WORDS), /^5 января 2025/);
});

test("listTime: сегодня — часы, вчера — «Вчера», иначе дата", () => {
  assert.equal(listTime(at(27, 9, 5), NOW, WORDS), "09:05");
  assert.equal(listTime(at(26, 9, 5), NOW, WORDS), "Вчера");
  assert.match(listTime(at(20, 9), NOW, WORDS), /^20 нояб/);
  assert.equal(listTime(new Date(2025, 0, 5, 10).toISOString(), NOW, WORDS), "05.01.25");
});

// ---------- Ввод, права, значки ----------

test("пустое и из одних пробелов не отправляется; лимит 4000", () => {
  assert.equal(canSend(""), false);
  assert.equal(canSend("  \n "), false);
  assert.equal(canSend("ок"), true);
  assert.equal(canSend("a".repeat(4000)), true);
  assert.equal(canSend("a".repeat(4001)), false);
});

test("счётчик символов появляется, когда осталось мало", () => {
  assert.equal(remainingChars("a".repeat(100)), null);
  assert.equal(remainingChars("a".repeat(3850)), 150);
});

test("удалить: своё — да; чужое — только Owner/Admin/Manager; удалённое — нет", () => {
  assert.equal(canDeleteMessage(msg(), "u1", "employee"), true);
  assert.equal(canDeleteMessage(msg(), "u2", "employee"), false);
  assert.equal(canDeleteMessage(msg(), "u2", "manager"), true);
  assert.equal(canDeleteMessage(msg({ deletedAt: at(27, 11) }), "u1", "owner"), false);
});

test("значок: больше 99 — «99+»; сумма непрочитанного", () => {
  assert.equal(badgeText(5), "5");
  assert.equal(badgeText(99), "99");
  assert.equal(badgeText(100), "99+");
  assert.equal(totalUnread([{ unread: 2 }, { unread: 0 }, { unread: 7 }]), 9);
});

test("превью: «Вы: », имя автора, «Сообщение удалено», переносы схлопываются", () => {
  const w = { you: "Вы", deleted: "Сообщение удалено", empty: "Нет сообщений" };
  assert.equal(chatPreview({ at: at(27, 9), body: "Привет\nвсем", authorId: "me" }, "me", null, w), "Вы: Привет всем");
  assert.equal(chatPreview({ at: at(27, 9), body: "Да", authorId: "u2" }, "me", "Анна", w), "Анна: Да");
  assert.equal(chatPreview({ at: at(27, 9), body: null, authorId: "u2" }, "me", "Анна", w), "Анна: Сообщение удалено");
  assert.equal(chatPreview({ at: null, body: null, authorId: null }, "me", null, w), "Нет сообщений");
});

// ---------- Ссылки ----------

test("ссылки становятся кликабельными, знак препинания в конце — не часть ссылки", () => {
  assert.deepEqual(linkify("Смотри https://tandemkz.com/work, там всё."), [
    { kind: "text", text: "Смотри " },
    { kind: "link", text: "https://tandemkz.com/work", href: "https://tandemkz.com/work" },
    { kind: "text", text: ", там всё." },
  ]);
  assert.deepEqual(linkify("www.example.com"), [{ kind: "link", text: "www.example.com", href: "https://www.example.com" }]);
  assert.deepEqual(linkify("без ссылок"), [{ kind: "text", text: "без ссылок" }]);
});

test("javascript: и прочие схемы ссылками не становятся", () => {
  assert.deepEqual(linkify("javascript:alert(1)"), [{ kind: "text", text: "javascript:alert(1)" }]);
});

test("скобка в конце остаётся частью ссылки, если в ней есть открывающая", () => {
  const parts = linkify("(см. https://ru.wikipedia.org/wiki/Тандем_(значения))");
  const link = parts.find((p) => p.kind === "link");
  assert.equal(link?.text, "https://ru.wikipedia.org/wiki/Тандем_(значения))".slice(0, -1));
});

// ---------- Ошибки и client_id ----------

test("коды ошибок переводятся", () => {
  assert.equal(chatDbError({ message: "rate_limited" }), "rateLimited");
  assert.equal(chatDbError({ message: "page_unavailable" }), "pageUnavailable");
  assert.equal(chatDbError({ message: "TypeError: Failed to fetch" }), "network");
  assert.equal(chatDbError({ message: "что-то новое" }), "generic");
});

test("client_id — UUID v4", () => {
  assert.match(newClientId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
