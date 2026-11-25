import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agoParts,
  canEditTask,
  canWorkTask,
  cleanCoassignees,
  EMPTY_FILTERS,
  filterTasks,
  groupByStatus,
  isOverdue,
  joinLocalDateTime,
  sameSet,
  sortTasks,
  splitLocalDateTime,
  taskDbError,
  validateComment,
  validateTask,
  withStatus,
  type Task,
} from "./logic.ts";

const NOW = Date.parse("2026-11-24T12:00:00Z");
const HOUR = 3_600_000;

function task(over: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Выложить товар",
    description: "Витрина у входа",
    status: "todo",
    priority: "normal",
    assigneeId: null,
    coassignees: [],
    dueAt: new Date(NOW + HOUR).toISOString(),
    createdAt: new Date(NOW - HOUR).toISOString(),
    createdBy: "author",
    completedAt: null,
    archivedAt: null,
    version: 1,
    comments: 0,
    ...over,
  };
}

test("проверка формы задачи", () => {
  const due = new Date(NOW + HOUR).toISOString();
  assert.deepEqual(validateTask({ title: "Задача", description: "Текст", dueAt: due }, NOW), {});
  assert.deepEqual(validateTask({ title: "   ", description: " ", dueAt: null }, NOW), {
    title: "taskTitleRequired",
    description: "taskDescriptionRequired",
    due: "dueRequired",
  });
  assert.equal(validateTask({ title: "x".repeat(201), description: "a", dueAt: due }, NOW).title, "taskTitleTooLong");
  assert.equal(validateTask({ title: "a", description: "x".repeat(5001), dueAt: due }, NOW).description, "taskDescriptionTooLong");
  assert.equal(validateTask({ title: "a", description: "b", dueAt: new Date(NOW - 1).toISOString() }, NOW).due, "dueInPast");
  assert.equal(validateComment("  "), "commentRequired");
  assert.equal(validateComment("x".repeat(2001)), "commentTooLong");
  assert.equal(validateComment("Готово"), null);
});

test("дата и время из формы ↔ момент времени", () => {
  const iso = joinLocalDateTime("2026-12-01", "18:30");
  assert.ok(iso);
  assert.deepEqual(splitLocalDateTime(iso!), { date: "2026-12-01", time: "18:30" });
  assert.equal(joinLocalDateTime("", "18:30"), null);
  assert.equal(joinLocalDateTime("2026-12-01", "6pm"), null);
});

test("ошибки базы → понятный текст", () => {
  assert.equal(taskDbError({ message: "task_conflict" }), "taskConflict");
  assert.equal(taskDbError({ message: "due_in_past" }), "dueInPast");
  assert.equal(taskDbError({ message: "self_assign_forbidden" }), "selfAssignForbidden");
  assert.equal(taskDbError({ message: "assignee_no_access" }), "assigneeNoAccess");
  assert.equal(taskDbError({ message: "page_unavailable" }), "pageUnavailable");
  assert.equal(taskDbError({ message: "forbidden" }), "forbidden");
  assert.equal(taskDbError({ message: "subscription_inactive" }), "subscriptionInactive");
  assert.equal(taskDbError({ message: "rate_limited" }), "rateLimited");
  assert.equal(taskDbError({ message: "TypeError: Failed to fetch" }), "network");
  assert.equal(taskDbError({ message: "что-то новое" }), "generic");
});

test("кто что может (для показа кнопок)", () => {
  const t1 = task({ createdBy: "author", assigneeId: "a", coassignees: ["c"] });
  assert.equal(canEditTask(t1, "author", "employee"), true);
  assert.equal(canEditTask(t1, "x", "manager"), true);
  assert.equal(canEditTask(t1, "a", "employee"), false, "ответственный не меняет поля");
  assert.equal(canWorkTask(t1, "a", "employee"), true, "ответственный меняет статус");
  assert.equal(canWorkTask(t1, "c", "employee"), true, "соисполнитель меняет статус");
  assert.equal(canWorkTask(t1, "x", "employee"), false, "посторонний сотрудник — нет");
});

test("просрочка — только у неготовых задач с прошедшим дедлайном", () => {
  const late = new Date(NOW - HOUR).toISOString();
  assert.equal(isOverdue(task({ dueAt: late }), NOW), true);
  assert.equal(isOverdue(task({ dueAt: late, status: "done" }), NOW), false);
  assert.equal(isOverdue(task(), NOW), false);
});

test("фильтры", () => {
  const list = [
    task({ id: "1", title: "Касса", assigneeId: "me" }),
    task({ id: "2", title: "Склад", coassignees: ["me"], priority: "urgent" }),
    task({ id: "3", title: "Витрина", dueAt: new Date(NOW - HOUR).toISOString(), status: "in_progress" }),
  ];
  const ids = (f: Partial<typeof EMPTY_FILTERS>) => filterTasks(list, { ...EMPTY_FILTERS, ...f }, "me", NOW).map((x) => x.id);
  assert.deepEqual(ids({}), ["1", "2", "3"]);
  assert.deepEqual(ids({ mine: true }), ["1", "2"]);
  assert.deepEqual(ids({ overdue: true }), ["3"]);
  assert.deepEqual(ids({ assignee: "none" }), ["2", "3"], "требуют переназначения");
  assert.deepEqual(ids({ assignee: "me" }), ["1"]);
  assert.deepEqual(ids({ priority: "urgent" }), ["2"]);
  assert.deepEqual(ids({ status: "in_progress" }), ["3"]);
  assert.deepEqual(ids({ query: "  КАС " }), ["1"]);
});

test("порядок, колонки и перенос по доске", () => {
  const a = task({ id: "a", dueAt: "2026-12-02T00:00:00Z" });
  const b = task({ id: "b", dueAt: "2026-12-01T00:00:00Z", priority: "low" });
  const c = task({ id: "c", dueAt: "2026-12-01T00:00:00Z", priority: "urgent", status: "done" });
  assert.deepEqual(sortTasks([a, b, c]).map((x) => x.id), ["c", "b", "a"]);
  const g = groupByStatus([a, b, c]);
  assert.deepEqual([g.todo.length, g.in_progress.length, g.done.length], [2, 0, 1]);
  const moved = withStatus([a, b], "a", "done");
  assert.equal(moved[0]!.status, "done");
  assert.ok(moved[0]!.completedAt);
  assert.equal(withStatus(moved, "a", "todo")[0]!.completedAt, null);
  assert.equal(a.status, "todo", "исходный список не меняется");
});

test("создано N назад", () => {
  assert.deepEqual(agoParts(new Date(NOW - 20_000).toISOString(), NOW), { kind: "now" });
  assert.deepEqual(agoParts(new Date(NOW - 5 * 60_000).toISOString(), NOW), { kind: "minutes", n: 5 });
  assert.deepEqual(agoParts(new Date(NOW - 3 * HOUR).toISOString(), NOW), { kind: "hours", n: 3 });
  assert.deepEqual(agoParts(new Date(NOW - 50 * HOUR).toISOString(), NOW), { kind: "days", n: 2 });
});

test("соисполнители без ответственного и повторов", () => {
  assert.deepEqual(cleanCoassignees(["a", "b", "a", "c"], "b"), ["a", "c"]);
  assert.equal(sameSet(["a", "b"], ["b", "a"]), true);
  assert.equal(sameSet(["a"], ["a", "b"]), false);
});
