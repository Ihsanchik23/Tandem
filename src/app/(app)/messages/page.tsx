import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PHOTOS } from "@/components/guest/photos";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { getUserId } from "@/lib/auth/session";
import { getMyCompany } from "@/lib/company/queries";
import { t } from "@/lib/i18n";
import { MessagesScreen } from "@/modules/chat/MessagesScreen";

export const metadata: Metadata = { title: `${t.messages.title} — ${t.app.name}` };

// «Сообщения» (ТЗ, раздел 13): список доступных чатов компании; справа — выбранный чат
// или фото, пока чат не выбран. Создать чат отсюда нельзя.
export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const company = await getMyCompany(userId);
  return (
    <MessagesScreen
      me={userId}
      role={company?.role ?? null}
      hero={
        <HeroPanel
          photo={PHOTOS.messages}
          alt={t.messages.heroAlt}
          title={t.messages.heroTitle}
          // Колонка = экран минус меню слева (72px) и список (400px, с 1280px — 460px).
          sizes="(min-width: 1280px) calc(100vw - 532px), calc(100vw - 472px)"
        />
      }
    />
  );
}
