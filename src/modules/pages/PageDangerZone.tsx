"use client";

import { useActionState, useState, startTransition } from "react";
import { t } from "@/lib/i18n";
import { Collapse } from "@/components/ui/Collapse";
import { FormMessage } from "@/components/ui/FormMessage";
import { Group, Row } from "@/components/ui/Grouped";
import { archivePage, restorePage, type PageResult } from "./actions";

// «Опасная зона» в конце настроек: «В архив» (с подтверждением) или «Восстановить из архива».
export function PageDangerZone({ pageId, archived }: { pageId: string; archived: boolean }) {
  const p = t.pages;
  const [asking, setAsking] = useState(false);
  const [archState, archive, archiving] = useActionState<PageResult, FormData>(archivePage, {});
  const [restState, restore, restoring] = useActionState<PageResult, FormData>(restorePage, {});
  const run = (action: (fd: FormData) => void) => {
    const fd = new FormData();
    fd.set("page_id", pageId);
    startTransition(() => action(fd));
  };
  const error = archState.error ?? restState.error;

  return (
    <div className="flex flex-col gap-2">
      <Group title={p.dangerZone}>
        {archived ? (
          // Восстановить — без подтверждения: действие безопасное и обратимое.
          <Row label={restoring ? p.restoring : p.restore} onClick={restoring ? undefined : () => run(restore)} />
        ) : (
          <>
            <Row danger label={p.archiveShort} expanded={asking} onClick={() => setAsking((a) => !a)} />
            <Collapse open={asking}>
              <div className="flex flex-col gap-3 border-t-[0.5px] border-neutral-200 px-3.5 py-3">
                <p className="text-[14px] text-ink">{p.archiveConfirm}</p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAsking(false)}
                    disabled={archiving}
                    className="h-9 rounded-full px-4 text-[14px] font-medium text-ink hover:bg-black/5"
                  >
                    {p.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => run(archive)}
                    disabled={archiving}
                    className="h-9 rounded-full bg-red-700 px-4 text-[14px] font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                  >
                    {archiving ? p.archiving : p.archiveYes}
                  </button>
                </div>
              </div>
            </Collapse>
          </>
        )}
      </Group>
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
    </div>
  );
}
