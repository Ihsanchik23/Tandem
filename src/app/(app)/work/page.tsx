import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StubPage } from "@/components/layout/StubPage";
import { FormFallback } from "@/components/auth/FormFallback";
import { NoCompany, WorkHome } from "@/components/company/WorkHome";
import { FormMessage } from "@/components/ui/FormMessage";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { getUserId } from "@/lib/auth/session";
import { getMyCompany, hasFreeSubscription } from "@/lib/company/queries";
import { t } from "@/lib/i18n";
import { getCompanyPages } from "@/modules/pages/queries";

type SearchParams = PageProps<"/work">["searchParams"];

// «Работа». Сюда попадают при обычном входе и после создания компании.
export default function WorkPage({ searchParams }: PageProps<"/work">) {
  return (
    <Suspense
      fallback={
        <StubPage title={t.work.title}>
          <FormFallback />
        </StubPage>
      }
    >
      <WorkContent searchParams={searchParams} />
    </Suspense>
  );
}

async function WorkContent({ searchParams }: { searchParams: SearchParams }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const notice = <Notice searchParams={searchParams} />;
  const company = await getMyCompany(userId);
  if (company) {
    // В список — только доступные мне страницы (метаданные компании видят все, доступ — по page_access).
    const pages = (await getCompanyPages(company.org.id, userId)).filter((p) => p.hasAccess);
    return (
      <StubPage title={t.work.title}>
        {notice}
        <WorkHome company={company} pages={pages} />
      </StubPage>
    );
  }

  // Компании нет. Телефон: как раньше — текст и кнопки «Найти» / «Создать» (в меню они спрятаны).
  // Компьютер: фото с заголовком; действия — в панели слева.
  const canCreate = await hasFreeSubscription(userId);
  return (
    <>
      <div className="flex flex-1 flex-col md:hidden">
        <StubPage title={t.work.title}>
          {notice}
          <NoCompany canCreate={canCreate} />
        </StubPage>
      </div>
      <main className="hidden min-h-dvh flex-1 md:flex">
        <HeroPanel
          src="/images/work/work-hero.jpg"
          width={2352}
          height={1760}
          alt={t.work.heroAlt}
          title={t.work.heroTitle}
          // Область = экран минус меню слева (64px) и панель компании (288px).
          sizes="calc(100vw - 352px)"
          placement="bottom"
          objectPosition="50% 35%"
          headingLevel={1}
          notice={notice}
        />
      </main>
    </>
  );
}

async function Notice({ searchParams }: { searchParams: SearchParams }) {
  const { notice } = await searchParams;
  const texts: Record<string, string> = {
    passwordChanged: t.auth.notices.passwordChanged,
    joined: t.work.joinedNotice,
    left: t.work.leftNotice,
  };
  const text = typeof notice === "string" ? texts[notice] : undefined;
  return text ? <FormMessage kind="notice">{text}</FormMessage> : null;
}
