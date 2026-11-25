import type { Metadata } from "next";
import { Suspense } from "react";
import { ListDetailLayout } from "@/components/layout/ListDetailLayout";
import { GuestGate } from "@/components/guest/GuestGate";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.messages.title} — ${t.app.name}` };

// «Сообщения» (ТЗ, раздел 13). Раскладка как у «Поиска»: слева список, справа фото.
// Список чатов появится в день 6; пока слева — пустое состояние. Без входа — гостевой экран.
export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <GuestGate section="messages">
        <MessagesContent />
      </GuestGate>
    </Suspense>
  );
}

function MessagesContent() {
  return (
    <ListDetailLayout
      title={t.messages.title}
      detailLabel={t.messages.detailLabel}
      list={
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center">
          <span className="text-ink">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z" />
            </svg>
          </span>
          <p className="text-base text-ink">{t.messages.empty}</p>
        </div>
      }
      detail={
        <HeroPanel
          src="/images/messages/messages-hero.jpg"
          width={1760}
          height={2352}
          alt={t.messages.heroAlt}
          title={t.messages.heroTitle}
          // Колонка = экран минус меню слева (64px) и список (400px, с 1280px — 460px).
          sizes="(min-width: 1280px) calc(100vw - 524px), calc(100vw - 464px)"
          objectPosition="50% 15%"
        />
      }
    />
  );
}
