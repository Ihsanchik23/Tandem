"use client";

import { useActionState } from "react";
import { acceptInvite, type ActionState } from "@/lib/company/actions";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";

// Вступление по ссылке. Ссылку, подписку, места и членство проверяет accept_invite.
export function JoinButton({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(acceptInvite, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      {state.error ? <FormMessage kind="error">{t.errors[state.error]}</FormMessage> : null}
      <Button type="submit" pending={pending} pendingText={t.invite.joining}>
        {t.invite.join}
      </Button>
    </form>
  );
}
