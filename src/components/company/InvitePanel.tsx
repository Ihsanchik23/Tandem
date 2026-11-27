"use client";

import { Copy, Check, ShareNetwork } from "@phosphor-icons/react";
import { startTransition, useActionState, useState, useSyncExternalStore } from "react";
import { createInvite, revokeInvite, type ActionState } from "@/lib/company/actions";
import { invitePath, type InviteRow } from "@/lib/company/invite";
import { format, t } from "@/lib/i18n";
import { Collapse } from "@/components/ui/Collapse";
import { FormMessage } from "@/components/ui/FormMessage";
import { Row, Section } from "@/components/ui/Grouped";
import { MoreMenu } from "@/components/ui/MoreMenu";

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

type Asking = "new" | "revoke" | null;

// «Пригласить людей» (Owner/Admin) — одна компактная карточка: ссылка (обрезанная), копировать,
// «Поделиться», срок. «Создать новую ссылку» и «Отозвать» — в меню «⋯», с подтверждением.
export function InvitePanel({ organizationId, organizationName, invites, seats }: Props) {
  const c = t.company;
  const current = invites[0] ?? null;
  const origin = useOrigin();
  const [createState, create, creating] = useActionState<ActionState, FormData>(createInvite, {});
  const [revokeState, revoke, revoking] = useActionState<ActionState, FormData>(revokeInvite, {});
  const [asking, setAsking] = useState<Asking>(null);
  const [copied, setCopied] = useState(false);

  const url = current ? `${origin}${invitePath(current.token)}` : "";
  const shortUrl = url.replace(/^https?:\/\//, "");
  const until = current
    ? new Date(current.expires_at).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : "";
  const error = createState.error ?? revokeState.error;

  function run(kind: "new" | "revoke") {
    const fd = new FormData();
    if (kind === "new") fd.set("organization_id", organizationId);
    else if (current) fd.set("invite_id", current.id);
    setAsking(null);
    startTransition(() => (kind === "new" ? create(fd) : revoke(fd)));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер обмена недоступен — поможет «Поделиться».
    }
  }
  // Телефон — системное меню «Поделиться»; компьютер без него — копирование.
  async function share() {
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "Tandem", text: format(c.inviteShareText, { name: organizationName }), url });
      } catch {
        // Закрыли меню «Поделиться».
      }
    } else {
      await copy();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Section
        title={c.inviteTitle}
        info={c.inviteHint}
        infoLabel={t.pages.info}
        action={
          current ? (
            <MoreMenu
              size="sm"
              tip="end"
              items={[
                { key: "new", label: c.inviteNew, onSelect: () => setAsking("new") },
                { key: "revoke", label: c.inviteRevoke, tone: "danger", onSelect: () => setAsking("revoke") },
              ]}
            />
          ) : null
        }
      >
        <Row
          label={c.inviteByLink}
          value={seats ? format(c.seats, { used: seats.used, seats: seats.total }) : undefined}
        />
        {current ? (
          <>
            {/* Ссылка целиком не показывается: обрезанная строка и «копировать». */}
            <div className="group flex items-center gap-2 pl-3.5">
              <span className="flex min-h-12 min-w-0 flex-1 items-center gap-2 border-b-[0.5px] border-black/[0.09] pr-1.5">
                <span className="min-w-0 flex-1 truncate text-[14px] text-muted" title={url}>
                  {shortUrl}
                </span>
                <button
                  type="button"
                  onClick={copy}
                  aria-label={copied ? c.inviteCopied : c.inviteCopyLink}
                  title={copied ? c.inviteCopied : c.inviteCopyLink}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition-colors hover:bg-black/5 ${copied ? "text-emerald-700" : "text-ink"}`}
                >
                  {copied ? <Check size={18} weight="bold" /> : <Copy size={18} />}
                  {copied ? c.inviteCopied : null}
                </button>
              </span>
            </div>
            <button
              type="button"
              onClick={share}
              className="flex min-h-12 w-full items-center justify-center gap-2 border-b-[0.5px] border-black/[0.09] text-[15px] font-medium text-accent transition-colors hover:bg-black/[0.03] active:bg-black/[0.06]"
            >
              <ShareNetwork size={18} />
              {c.inviteShare}
            </button>
            <p className="px-3.5 py-2.5 text-[12px] text-muted" suppressHydrationWarning>
              {format(c.inviteValidUntil, { date: until })}
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => run("new")}
            disabled={creating}
            className="flex min-h-12 w-full items-center justify-center text-[15px] font-medium text-accent transition-colors hover:bg-black/[0.03] disabled:opacity-60"
          >
            {creating ? c.inviteCreating : c.inviteCreate}
          </button>
        )}

        {/* Подтверждение новой ссылки или отзыва — внутри карточки. */}
        <Collapse open={asking !== null}>
          <div className="flex flex-col gap-3 border-t-[0.5px] border-black/[0.09] px-3.5 py-3">
            <p className="text-[14px] text-ink">{asking === "revoke" ? c.inviteRevokeConfirm : c.inviteNewConfirm}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAsking(null)} className="h-9 rounded-full px-4 text-[14px] font-medium text-ink hover:bg-black/5">
                {t.pages.cancel}
              </button>
              <button
                type="button"
                onClick={() => asking && run(asking)}
                className={`h-9 rounded-full px-4 text-[14px] font-semibold text-white ${asking === "revoke" ? "bg-red-700 hover:bg-red-800" : "bg-accent hover:bg-accent-hover"}`}
              >
                {asking === "revoke" ? c.inviteRevoke : c.inviteNew}
              </button>
            </div>
          </div>
        </Collapse>
      </Section>
      {creating || revoking ? <p className="px-3.5 text-[13px] text-muted">{creating ? c.inviteCreating : c.inviteRevoking}</p> : null}
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
      {!current && !creating ? <p className="px-3.5 text-[13px] text-muted">{c.inviteNone}</p> : null}
    </div>
  );
}
