"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { loadNewPageData, type NewPageData } from "./actions";
import { closeNewPage, forgetNewPagePush, markNewPagePushed, NEW_PAGE, withoutNewPage } from "./newPage";
import { NEW_PAGE_FORM_ID, NewPageForm } from "./NewPageForm";

// Панель «Новая страница» — одна на весь раздел «Работа» (стоит в work/layout.tsx).
// Открывается адресом ?new-page=1 (+ ?unit=<id> или ?scope=organization), справа, как карточка задачи;
// на телефоне — на весь экран. Каждое открытие — чистая форма с данными, загруженными заново.
export function NewPagePanel() {
  const p = t.pages;
  const router = useRouter();
  const params = useSearchParams();
  const open = params.get(NEW_PAGE) === "1";
  const unit = params.get("unit");
  const scope = params.get("scope");

  // Номер открытия: новая форма на каждое открытие (и при смене подразделения в адресе).
  const openKey = open ? `${unit ?? ""}|${scope ?? ""}` : null;
  const [session, setSession] = useState({ key: openKey, n: 0 });
  if (session.key !== openKey) {
    setSession({ key: openKey, n: openKey ? session.n + 1 : session.n });
    // Открыли, когда экран уже был показан (нажатие в приложении) — значит, в истории есть запись.
    if (!session.key && openKey) markNewPagePushed();
    if (!openKey) forgetNewPagePush();
  }

  const [loaded, setLoaded] = useState<{ n: number; data: NewPageData | null; failed: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void loadNewPageData()
      .then((res) => alive && setLoaded({ n: session.n, data: res.data ?? null, failed: !res.data }))
      .catch(() => alive && setLoaded({ n: session.n, data: null, failed: true }));
    return () => {
      alive = false;
    };
  }, [open, session.n, retry]);

  const current = loaded && loaded.n === session.n ? loaded : null;
  const data = current?.data ?? null;

  function created(pageId: string) {
    // Убираем панель из адреса и истории — «Назад» со страницы не откроет форму снова.
    window.history.replaceState(null, "", withoutNewPage());
    forgetNewPagePush();
    setPending(false);
    router.push(`/work/p/${pageId}`);
  }

  return (
    <Sheet
      open={open}
      title={p.createTitle}
      from="right"
      onClose={closeNewPage}
      footer={
        <>
          <SecondaryButton onClick={closeNewPage}>{p.cancel}</SecondaryButton>
          <PrimaryButton type="submit" form={NEW_PAGE_FORM_ID} pending={pending} pendingText={p.creating} disabled={!data}>
            {p.create}
          </PrimaryButton>
        </>
      }
    >
      {data ? (
        <NewPageForm
          key={session.n}
          data={data}
          initialUnit={unit}
          initialScope={scope}
          onPending={setPending}
          onCreated={created}
        />
      ) : current?.failed ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-[15px] text-ink">{p.loadFailed}</p>
          <button type="button" onClick={() => setRetry((n) => n + 1)} className="text-[15px] font-medium text-accent underline underline-offset-4">
            {p.retry}
          </button>
        </div>
      ) : (
        <FormSkeleton />
      )}
    </Sheet>
  );
}

function FormSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6 pt-8">
      <span className="h-[104px] animate-pulse rounded-xl bg-surface" />
      <span className="h-28 animate-pulse rounded-xl bg-surface" />
      <span className="h-40 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}
