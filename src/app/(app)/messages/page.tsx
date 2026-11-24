import { StubPage } from "@/components/layout/StubPage";
import { t } from "@/lib/i18n";

// «Сообщения» — пока пустое состояние (ТЗ, раздел 13). Список чатов появится в день 6.
export default function MessagesPage() {
  return (
    <StubPage title={t.messages.title}>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center">
        <span className="text-ink">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z" />
          </svg>
        </span>
        <p className="text-base text-ink">{t.messages.empty}</p>
      </div>
    </StubPage>
  );
}
