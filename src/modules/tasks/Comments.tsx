"use client";

import { useState, useTransition } from "react";
import { t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Avatar } from "@/components/profile/Avatar";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { addComment, deleteComment, editComment } from "./api";
import type { TaskComment } from "./data";
import { TASK_LIMITS, validateComment } from "./logic";
import { formatAgo } from "./time";

const areaClass =
  "min-h-20 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

// Комментарии: пишут автор, ответственный, соисполнители и руководители (решает база).
// Свой комментарий можно изменить и удалить. Ссылки — обычным текстом, файлов нет.
export function Comments({
  taskId,
  me,
  comments,
  canComment,
  now,
  onChanged,
}: {
  taskId: string;
  me: string;
  comments: TaskComment[] | null;
  canComment: boolean;
  now: number | null;
  onChanged: () => void;
}) {
  const s = t.tasks;
  const [body, setBody] = useState("");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();

  function send() {
    const invalid = validateComment(body);
    if (invalid) return setError(invalid);
    start(async () => {
      const res = await addComment(taskId, body);
      if (!res.ok) return setError(res.error);
      setError(null);
      setBody("");
      onChanged();
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-ink">{s.comments}</h3>
      {comments === null ? (
        <p className="text-sm text-ink">{s.loading}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-ink">{s.commentsEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} mine={c.authorId === me} canChange={canComment} now={now} onChanged={onChanged} />
          ))}
        </ul>
      )}

      {canComment ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={s.commentPlaceholder}
            aria-label={s.commentPlaceholder}
            maxLength={TASK_LIMITS.comment}
            className={areaClass}
          />
          {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
          <Button type="button" onClick={send} pending={pending} pendingText={s.commentSending} disabled={!body.trim()}>
            {s.commentSend}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-ink">{s.commentNoRights}</p>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  mine,
  canChange,
  now,
  onChanged,
}: {
  comment: TaskComment;
  mine: boolean;
  canChange: boolean;
  now: number | null;
  onChanged: () => void;
}) {
  const s = t.tasks;
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [draft, setDraft] = useState(comment.body ?? "");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();
  const name = comment.author?.name || s.formerMember;

  function save() {
    const invalid = validateComment(draft);
    if (invalid) return setError(invalid);
    start(async () => {
      const res = await editComment(comment.id, draft);
      if (!res.ok) return setError(res.error);
      setError(null);
      setMode("view");
      onChanged();
    });
  }
  function remove() {
    start(async () => {
      const res = await deleteComment(comment.id);
      if (!res.ok) return setError(res.error);
      setMode("view");
      onChanged();
    });
  }

  if (comment.deletedAt) {
    return <li className="rounded-xl bg-neutral-50 px-3 py-2 text-sm italic text-ink">{s.commentDeleted}</li>;
  }

  return (
    <li className="flex gap-3">
      <Avatar url={comment.author?.avatarUrl} name={name} size={32} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium text-ink">{name}</span>
          {now !== null ? <span className="text-xs text-ink">{formatAgo(comment.createdAt, now)}</span> : null}
          {comment.editedAt ? <span className="text-xs text-ink">· {s.commentEdited}</span> : null}
        </p>
        {mode === "edit" ? (
          <div className="mt-1 flex flex-col gap-2">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={TASK_LIMITS.comment} className={areaClass} aria-label={s.commentEdit} />
            <div className="flex gap-2">
              <Button type="button" onClick={save} pending={pending} pendingText={s.saving} className="h-10!">
                {s.save}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMode("view")} disabled={pending} className="h-10!">
                {s.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-base text-ink">{comment.body}</p>
        )}
        {mode === "delete" ? (
          <div className="mt-2 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-900">{s.commentDeleteConfirm}</p>
            <div className="flex gap-2">
              <Button type="button" onClick={remove} pending={pending} pendingText={s.saving} className="h-10! bg-red-700! hover:bg-red-800!">
                {s.commentDeleteYes}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMode("view")} disabled={pending} className="h-10!">
                {s.cancel}
              </Button>
            </div>
          </div>
        ) : null}
        {mine && canChange && mode === "view" ? (
          <div className="mt-1 flex gap-4">
            <button type="button" onClick={() => { setDraft(comment.body ?? ""); setMode("edit"); }} className="text-sm font-medium text-accent">
              {s.commentEdit}
            </button>
            <button type="button" onClick={() => setMode("delete")} className="text-sm font-medium text-red-700">
              {s.commentDelete}
            </button>
          </div>
        ) : null}
        {error ? <div className="mt-2"><FormMessage kind="error">{t.errors[error]}</FormMessage></div> : null}
      </div>
    </li>
  );
}
