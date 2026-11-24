"use client";

import { useEffect } from "react";
import { t } from "@/lib/i18n";

// Страховка экрана «Структура»: вместо белого экрана — понятное сообщение.
// Текст ошибки остаётся в консоли браузера (пока не подключён Sentry — день 8).
export default function StructureError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Структура:", error);
  }, [error]);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-10 text-center">
      <h1 className="text-xl font-semibold text-ink">{t.canvas.crashTitle}</h1>
      <p className="max-w-sm text-base text-neutral-600">{t.canvas.crashText}</p>
      <button
        type="button"
        onClick={() => {
          reset();
          window.location.reload();
        }}
        className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-medium text-white hover:bg-accent-hover"
      >
        {t.canvas.reload}
      </button>
    </main>
  );
}
