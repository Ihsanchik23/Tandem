"use client";

import { useActionState, useState } from "react";
import { t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Button } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { FormMessage } from "@/components/ui/FormMessage";

// Результат действия: текст ошибки или отметка «выполнено».
type ActionState = { error?: ErrorKey; done?: number };

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields?: Record<string, string>;
  label: string;
  confirmText: string;
  yesLabel: string;
  pendingLabel: string;
};

// Красная кнопка опасного действия с подтверждением в два шага (удалить сотрудника, выйти из компании).
// Кнопка плавно сменяется блоком подтверждения.
export function ConfirmAction({ action, fields = {}, label, confirmText, yesLabel, pendingLabel }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [asking, setAsking] = useState(false);

  return (
    <div>
      <Collapse open={!asking}>
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-base font-medium text-red-700 hover:bg-red-50"
        >
          {label}
        </button>
      </Collapse>
      <Collapse open={asking}>
        <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <p className="text-base text-red-900">{confirmText}</p>
          {state.error ? <FormMessage kind="error">{t.errors[state.error]}</FormMessage> : null}
          <Button type="submit" pending={pending} pendingText={pendingLabel} className="bg-red-700! hover:bg-red-800!">
            {yesLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAsking(false)} disabled={pending}>
            {t.work.cancel}
          </Button>
        </form>
      </Collapse>
    </div>
  );
}
