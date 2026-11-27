import Link from "next/link";
import { t } from "@/lib/i18n";

// «Настройки» рабочей страницы — шестерёнкой в шапке телефона (тем, кто может настраивать).
export function PageSettingsLink({ pageId }: { pageId: string }) {
  return (
    <Link
      href={`/work/p/${pageId}/settings`}
      aria-label={t.pages.settings}
      title={t.pages.settings}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-neutral-100"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-[22px] w-[22px]" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
      </svg>
    </Link>
  );
}
