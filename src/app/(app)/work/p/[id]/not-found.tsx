import Link from "next/link";
import { StubPage } from "@/components/layout/StubPage";
import { t } from "@/lib/i18n";

export default function PageNotFound() {
  return (
    <StubPage title={t.pages.notFoundTitle}>
      <p className="text-base text-ink">{t.pages.notFoundText}</p>
      <Link href="/work" className="text-base font-medium text-accent underline underline-offset-4">
        {t.pages.backToList}
      </Link>
    </StubPage>
  );
}
