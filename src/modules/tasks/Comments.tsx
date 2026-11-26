"use client";

import { useState, useTransition } from "react";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Avatar } from "@/components/profile/Avatar";
import { FormMessage } from "@/components/ui/FormMessage";
import { IconButton, PencilIcon, TrashIcon } from "@/components/ui/IconButton";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { addComment, deleteComment, editComment } from "./api";
import type { TaskComment } from "./data";
import { TASK_LIMITS, validateComment } from "./logic";
import { formatAgo } from "./time";

// Сначала видны только последние комментарии; «Показать ещё» раскрывает по 5 более ранних.
const FIRST = 3;
const STEP = 5;

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
  const [limit, setLimit] = useState(FIRST);

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

  const total = comments?.filter((c) => !c.deletedAt).length ?? 0;
  const hidden = comments ? Math.max(0, comments.length - limit) : 0;
  const shown = comments ? comments.slice(hidden) : [];

  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        {s.comments}
        {total > 0 ? <span className="rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium tabular-nums text-muted">{total}</span> : null}
      </h3>

      {comments === null ? (
        <p className="text-sm text-muted">{s.loading}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted">{s.commentsEmpty}</p>
      ) : (
        <div className="flex flex-col">
          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setLimit((n) => n + STEP)}
              className="mb-1 self-start pl-11 text-[13px] font-medium text-accent hover:text-accent-hover"
            >
              {s.showMore} <span className="font-normal text-muted">· {format(s.hiddenCount, { n: hidden })}</span>
            </button>
          ) : null}
          <ul className="flex flex-col">
            {shown.map((c) => (
              <CommentItem key={c.id} comment={c} mine={c.authorId === me} canChange={canComment} now={now} onChanged={onChanged} />
            ))}
          </ul>
        </div>
      )}

      {canComment ? (
        <div className="flex flex-col gap-2">
          {/* Одно поле ввода внизу блока: растёт по мере набора, «Отправить» — справа в той же строке. */}
          <div className="flex items-end gap-2 rounded-[22px] bg-surface py-1.5 pl-4 pr-1.5 transition-shadow focus-within:shadow-[0_0_0_2px_rgba(191,74,49,0.25)]">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
              placeholder={s.commentPlaceholder}
              aria-label={s.commentPlaceholder}
              maxLength={TASK_LIMITS.comment}
              rows={1}
              className="block max-h-40 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-base leading-5 text-ink [field-sizing:content] placeholder:text-muted focus:outline-none md:text-[14px]"
            />
            <button
              type="button"
              onClick={send}
              disabled={pending || !body.trim()}
              className="h-8 shrink-0 rounded-full bg-accent px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:bg-neutral-300"
            >
              {pending ? s.commentSending : s.commentSend}
            </button>
          </div>
          {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
        </div>
      ) : (
        <p className="text-sm text-muted">{s.commentNoRights}</p>
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
  function startEdit() {
    setDraft(comment.body ?? "");
    setMode("edit");
  }

  if (comment.deletedAt) {
    return <li className="py-1.5 pl-11 text-[13px] italic text-muted">{s.commentDeleted}</li>;
  }

  const actions = mine && canChange && mode === "view";

  return (
    <li className="group relative -mx-2 flex gap-3 rounded-xl px-2 py-1.5 transition-colors [@media(hover:hover)]:hover:bg-surface/70">
      <Avatar url={comment.author?.avatarUrl} name={name} size={32} />
      <div className="min-w-0 flex-1">
        {/* Имя и время — одной строкой, текст — сразу под ними. */}
        <p className="flex min-w-0 items-baseline gap-1.5 pr-16 text-[13px] leading-5">
          <span className="truncate font-semibold text-ink">{name}</span>
          {now !== null ? <span className="shrink-0 text-[12px] text-muted">{formatAgo(comment.createdAt, now)}</span> : null}
          {comment.editedAt ? <span className="shrink-0 text-[12px] text-muted">· {s.commentEdited}</span> : null}
        </p>

        {mode === "edit" ? (
          <div className="mt-1.5 flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={TASK_LIMITS.comment}
              aria-label={s.commentEdit}
              autoFocus
              className="min-h-16 w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-base text-ink [field-sizing:content] focus:border-accent focus:outline-none md:text-[14px]"
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="h-8 rounded-full bg-ink px-3.5 text-[12px] font-semibold text-white disabled:opacity-60"
              >
                {pending ? s.saving : s.save}
              </button>
              <button type="button" onClick={() => setMode("view")} disabled={pending} className="h-8 rounded-full px-3 text-[12px] font-medium text-ink hover:bg-surface">
                {s.cancel}
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[14px] leading-snug text-ink">{comment.body}</p>
        )}

        {mode === "delete" ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2">
            <span className="mr-auto text-[13px] text-red-900">{s.commentDeleteConfirm}</span>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="h-8 rounded-full bg-red-700 px-3.5 text-[12px] font-semibold text-white hover:bg-red-800 disabled:opacity-60"
            >
              {pending ? s.saving : s.commentDeleteYes}
            </button>
            <button type="button" onClick={() => setMode("view")} disabled={pending} className="h-8 rounded-full px-3 text-[12px] font-medium text-ink hover:bg-white">
              {s.cancel}
            </button>
          </div>
        ) : null}
        {error ? (
          <div className="mt-2">
            <FormMessage kind="error">{t.errors[error]}</FormMessage>
          </div>
        ) : null}
      </div>

      {/* Действия — в той же строке справа. С мышью — значки при наведении; на телефоне — «⋯». */}
      {actions ? (
        <div className="absolute right-1.5 top-0.5 flex items-center">
          <div className="hidden items-center opacity-0 transition-opacity group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 [@media(hover:hover)]:flex">
            <IconButton label={s.commentEdit} onClick={startEdit} className="h-8! w-8!">
              <PencilIcon className="h-4 w-4" />
            </IconButton>
            <IconButton label={s.commentDelete} tone="danger" tip="end" onClick={() => setMode("delete")} className="h-8! w-8!">
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </div>
          <div className="[@media(hover:hover)]:hidden">
            <MoreMenu
              size="sm"
              label={s.commentActions}
              items={[
                { key: "edit", label: s.commentEdit, icon: <PencilIcon className="h-4 w-4" />, onSelect: startEdit },
                { key: "delete", label: s.commentDelete, icon: <TrashIcon className="h-4 w-4" />, tone: "danger", onSelect: () => setMode("delete") },
              ]}
            />
          </div>
        </div>
      ) : null}
    </li>
  );
}
