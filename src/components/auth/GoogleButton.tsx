"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { GoogleLogo } from "@/components/nav/icons";
import { FormMessage } from "@/components/ui/FormMessage";

// Разделитель «или» и кнопка «Войти через Google».
// Пока только внешний вид: вход через Google ещё не подключён, кнопка показывает «скоро».
export function GoogleButton() {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span aria-hidden className="h-px flex-1 bg-line" />
        {t.auth.or}
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>
      <button
        type="button"
        onClick={() => setShown(true)}
        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 text-base font-medium text-ink transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <GoogleLogo className="h-5 w-5" />
        {t.auth.google}
      </button>
      {shown ? <FormMessage kind="notice">{t.auth.googleSoon}</FormMessage> : null}
    </div>
  );
}
