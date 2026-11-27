"use client";

import { useState, useTransition } from "react";
import { t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { FormMessage } from "@/components/ui/FormMessage";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { PanelHeader } from "@/components/ui/Panel";
import { Sheet } from "@/components/ui/Sheet";
import { createTask, setStatus } from "./api";
import type { PagePerson } from "./data";
import { joinLocalDateTime, splitLocalDateTime, validateTask, type TaskFieldErrors, type TaskStatus } from "./logic";
import { TaskForm, type TaskFormValue } from "./TaskForm";

const FORM_ID = "create-task-form";

// По умолчанию дедлайн — завтра в 18:00 по времени телефона.
function emptyForm(): TaskFormValue {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  const { date, time } = splitLocalDateTime(d.toISOString());
  return { title: "", description: "", dueDate: date, dueTime: time, priority: "normal", assigneeId: null, coassignees: [] };
}

// status — колонка, где нажали «+»: задача создаётся и сразу встаёт туда.
export function CreateTask({
  open,
  status,
  pageId,
  people,
  me,
  onClose,
  onCreated,
}: {
  open: boolean;
  status: TaskStatus;
  pageId: string;
  people: PagePerson[];
  me: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const s = t.tasks;
  const [form, setForm] = useState<TaskFormValue>(emptyForm);
  const [errors, setErrors] = useState<TaskFieldErrors>({});
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setForm(emptyForm());
    setErrors({});
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const dueAt = joinLocalDateTime(form.dueDate, form.dueTime);
    const fieldErrors = validateTask({ title: form.title, description: form.description, dueAt });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return setError("fixFields");
    start(async () => {
      const res = await createTask({ pageId, ...form, dueAt: dueAt! });
      if (!res.ok) {
        if (res.error === "dueInPast") setErrors({ due: "dueInPast" });
        if (res.error === "selfAssignForbidden" || res.error === "assigneeNoAccess") setErrors({ assignee: res.error });
        return setError(res.error);
      }
      // База создаёт задачу в «Нужно сделать»; если нажали «+» у другой колонки — переносим туда.
      if (status !== "todo") await setStatus(res.value, status);
      reset();
      onCreated(res.value);
    });
  }

  const title = status === "todo" ? s.createTitle : `${s.createTitle} · ${s.status[status]}`;
  const close = () => {
    if (!pending) onClose();
  };

  // Выглядит как карточка просмотра: выезжает справа, общая шапка, кнопки закреплены внизу.
  return (
    <Sheet
      open={open}
      from="right"
      title={title}
      onClose={close}
      header={<PanelHeader title={title} onClose={close} />}
      footer={
        <>
          <SecondaryButton onClick={close} disabled={pending}>
            {s.cancel}
          </SecondaryButton>
          <PrimaryButton type="submit" form={FORM_ID} pending={pending} pendingText={s.creating} className="flex-1 md:flex-none">
            {s.createSubmit}
          </PrimaryButton>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-4 pt-2" noValidate>
        {/* Ошибки полей — под самими полями; здесь только общие (сеть, нет прав и т. п.). */}
        {error && error !== "fixFields" && !errors.due && !errors.assignee ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
        <TaskForm value={form} onChange={setForm} people={people} me={me} mode="create" errors={errors} />
      </form>
    </Sheet>
  );
}
