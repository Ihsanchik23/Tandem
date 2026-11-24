"use client";

import { useState, useTransition } from "react";
import { t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Button } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { FormMessage } from "@/components/ui/FormMessage";
import { updatePageScope } from "./actions";
import { isEmptySelection, type ScopeSelection } from "./logic";
import { ScopePicker } from "./ScopePicker";
import type { ScopeOptions } from "./scopeOptions";

// Смена доступа к странице — с подтверждением (ТЗ: изменение применяется ко всему содержимому).
export function ScopeForm({ pageId, options, initial }: { pageId: string; options: ScopeOptions; initial: ScopeSelection }) {
  const p = t.pages;
  const [value, setValue] = useState(initial);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const changed = JSON.stringify(value) !== JSON.stringify(initial);

  function save() {
    start(async () => {
      const res = await updatePageScope(pageId, value);
      setError(res.error ?? null);
      setSaved(!res.error);
      setAsking(false);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ScopePicker
        options={options}
        value={value}
        onChange={(v) => {
          setValue(v);
          setSaved(false);
          setError(null);
        }}
        error={isEmptySelection(value) ? t.errors.scopeRequired : null}
      />
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
      {saved ? <FormMessage kind="notice">{p.saved}</FormMessage> : null}
      <Collapse open={!asking}>
        <Button type="button" variant="secondary" disabled={!changed || isEmptySelection(value)} onClick={() => setAsking(true)}>
          {p.saveScope}
        </Button>
      </Collapse>
      <Collapse open={asking}>
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-300 bg-neutral-50 p-4">
          <p className="text-base text-ink">{p.scopeConfirm}</p>
          <Button type="button" onClick={save} pending={pending} pendingText={p.saving}>
            {p.scopeConfirmYes}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAsking(false)} disabled={pending}>
            {p.cancel}
          </Button>
        </div>
      </Collapse>
    </div>
  );
}
