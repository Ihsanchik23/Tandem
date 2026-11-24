"use client";

import { useState, useTransition } from "react";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { deleteBranch, getBranchSummary } from "./actions";
import { confirmLines, isEmptyBranch, type BranchSummary } from "./branch";

// Удаление подразделения со всей веткой. Пусто (нет людей и страниц) — удаляем сразу,
// иначе одно подтверждение: что станет с людьми и страницами.
export function DeleteBranch({ unitId, unitName }: { unitId: string; unitName: string }) {
  const c = t.canvas;
  const [summary, setSummary] = useState<BranchSummary | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [checking, startCheck] = useTransition();
  const [deleting, startDelete] = useTransition();

  function remove() {
    startDelete(async () => {
      const res = await deleteBranch(unitId);
      setError(res.error ?? null);
    });
  }

  function ask() {
    setError(null);
    startCheck(async () => {
      const res = await getBranchSummary(unitId);
      if (res.error || !res.summary) return setError(res.error ?? "generic");
      if (isEmptyBranch(res.summary)) {
        remove();
        return;
      }
      setSummary(res.summary);
    });
  }

  if (!summary) {
    return (
      <div className="flex flex-col gap-3">
        {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
        <button
          type="button"
          onClick={ask}
          disabled={checking || deleting}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-base font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {checking ? c.removeChecking : deleting ? c.removing : c.remove}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-base font-medium text-red-900">{format(c.removeTitle, { name: unitName })}</p>
      {confirmLines(summary).map((line) => (
        <p key={line} className="text-sm text-red-900">
          {line}
        </p>
      ))}
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
      <Button type="button" onClick={remove} pending={deleting} pendingText={c.removing} className="bg-red-700! hover:bg-red-800!">
        {c.removeYes}
      </Button>
      <Button type="button" variant="secondary" onClick={() => setSummary(null)} disabled={deleting}>
        {t.work.cancel}
      </Button>
    </div>
  );
}
