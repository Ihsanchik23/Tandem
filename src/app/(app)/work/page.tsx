import { Suspense } from "react";
import { StubPage } from "@/components/layout/StubPage";
import { FormMessage } from "@/components/ui/FormMessage";
import { t } from "@/lib/i18n";

// «Работа» — пока заглушка. Сюда попадают при обычном входе.
export default function WorkPage({ searchParams }: PageProps<"/work">) {
  return (
    <StubPage title={t.work.title}>
      <Suspense fallback={null}>
        <Notice searchParams={searchParams} />
      </Suspense>
      <p className="text-base text-neutral-600">{t.work.placeholder}</p>
    </StubPage>
  );
}

async function Notice({ searchParams }: { searchParams: PageProps<"/work">["searchParams"] }) {
  const { notice } = await searchParams;
  if (notice !== "passwordChanged") return null;
  return <FormMessage kind="notice">{t.auth.notices.passwordChanged}</FormMessage>;
}
