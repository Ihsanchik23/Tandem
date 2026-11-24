"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { restorePage, type PageResult } from "./actions";

// Восстановить страницу из архива — без подтверждения: действие безопасное и обратимое.
export function RestoreButton({ pageId }: { pageId: string }) {
  const [state, action, pending] = useActionState<PageResult, FormData>(restorePage, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="page_id" value={pageId} />
      {state.error ? <FormMessage kind="error">{t.errors[state.error]}</FormMessage> : null}
      <Button type="submit" variant="secondary" pending={pending} pendingText={t.pages.restoring}>
        {t.pages.restore}
      </Button>
    </form>
  );
}
