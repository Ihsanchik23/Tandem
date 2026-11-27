import Link from "next/link";
import { t } from "@/lib/i18n";
import { MarkSeen } from "@/modules/pages/MarkSeen";
import { PageIcon } from "@/components/ui/PageIcon";
import type { PageRow } from "@/modules/pages/queries";
import { ChatView } from "./ChatView";

// Рабочая страница «Чат» в «Работе». Лента на всю высоту экрана; поле ввода прижато к низу.
// Телефон: на весь экран (MobileScreen на странице): вверху «Назад», название и «Настройки».
export function ChatSection({
  page,
  canManage,
  me,
  role,
}: {
  page: PageRow;
  canManage: boolean;
  me: string;
  role: string | null;
}) {
  const p = t.pages;
  return (
    <main className="flex min-h-0 flex-1 flex-col md:h-dvh">
      <MarkSeen pageId={page.id} />
      <ChatView
        pageId={page.id}
        me={me}
        role={role}
        archived={page.archived}
        header={
          <header className="hidden shrink-0 items-center gap-4 border-b border-line px-6 py-4 md:flex">
            <PageIcon moduleKey="chat" tile={40} />
            <div className="min-w-0 flex-1">
              <h1 data-page-title className="truncate text-[20px] font-semibold leading-tight tracking-[-0.01em] text-ink">
                {page.name}
              </h1>
              <p className="mt-0.5 truncate text-[13px] text-muted">{page.description || p.modules.chat}</p>
            </div>
            {canManage ? (
              <Link
                href={`/work/p/${page.id}/settings`}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink hover:bg-line"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px]" aria-hidden>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
                </svg>
                {p.settingsShort}
              </Link>
            ) : null}
          </header>
        }
      />
    </main>
  );
}
