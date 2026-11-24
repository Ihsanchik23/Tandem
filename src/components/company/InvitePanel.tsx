"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { createInvite, revokeInvite, type ActionState } from "@/lib/company/actions";
import { invitePath, type InviteRow } from "@/lib/company/invite";
import { format, t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";

type Props = {
  organizationId: string;
  organizationName: string;
  invites: InviteRow[]; // действующие, новые сверху
  seats: { used: number; total: number } | null; // только для Owner
};

// Адрес сайта в браузере; на сервере — пусто (чтобы не было расхождения при загрузке).
const noop = () => () => {};
function useOrigin(): string {
  return useSyncExternalStore(noop, () => window.location.origin, () => "");
}

// «Пригласить людей» (Owner/Admin): одна действующая ссылка на 3 дня.
export function InvitePanel({ organizationId, organizationName, invites, seats }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createInvite, {});
  const c = t.company;
  const current = invites[0];

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-medium text-ink">{c.inviteTitle}</h2>
        <p className="text-sm text-ink">{c.inviteHint}</p>
        {seats ? (
          <p className="text-sm text-ink">{format(c.seats, { used: seats.used, seats: seats.total })}</p>
        ) : null}
      </div>

      {invites.map((inv) => (
        <InviteLink key={inv.id} invite={inv} organizationName={organizationName} />
      ))}
      {!current ? <p className="text-sm text-ink">{c.inviteNone}</p> : null}

      {state.error ? <FormMessage kind="error">{t.errors[state.error]}</FormMessage> : null}
      <form action={action} className="flex flex-col gap-1">
        <input type="hidden" name="organization_id" value={organizationId} />
        <Button type="submit" variant={current ? "secondary" : "primary"} pending={pending} pendingText={c.inviteCreating}>
          {current ? c.inviteNew : c.inviteCreate}
        </Button>
        {current ? <p className="text-center text-xs text-ink">{c.inviteNewHint}</p> : null}
      </form>
    </section>
  );
}

function InviteLink({ invite, organizationName }: { invite: InviteRow; organizationName: string }) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const [state, revoke, revoking] = useActionState<ActionState, FormData>(revokeInvite, {});
  const c = t.company;
  const url = `${origin}${invitePath(invite.token)}`;
  const until = new Date(invite.expires_at).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер обмена недоступен — ссылку видно на экране, её можно выделить вручную.
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Tandem", text: format(c.inviteShareText, { name: organizationName }), url });
      } catch {
        // Человек закрыл меню «Поделиться» — ничего не делаем.
      }
    } else {
      await copy();
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-neutral-50 p-3">
      <p className="select-all break-all text-sm font-medium text-ink">{url}</p>
      <p className="text-xs text-ink" suppressHydrationWarning>
        {format(c.inviteValidUntil, { date: until })}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={share}>
          {c.inviteShare}
        </Button>
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? c.inviteCopied : c.inviteCopy}
        </Button>
      </div>
      {state.error ? <FormMessage kind="error">{t.errors[state.error]}</FormMessage> : null}
      <form action={revoke}>
        <input type="hidden" name="invite_id" value={invite.id} />
        <button
          type="submit"
          disabled={revoking}
          className="text-sm font-medium text-red-700 underline underline-offset-4 disabled:opacity-60"
        >
          {revoking ? c.inviteRevoking : c.inviteRevoke}
        </button>
      </form>
    </div>
  );
}
