import Link from "next/link";
import { StubPage } from "@/components/layout/StubPage";
import { t } from "@/lib/i18n";

export default function MemberNotFound() {
  return (
    <StubPage title={t.company.memberTitle}>
      <p className="text-base text-neutral-600">{t.errors.notFound}</p>
      <Link href="/work/people" className="text-base font-medium text-accent underline underline-offset-4">
        {t.company.peopleTitle}
      </Link>
    </StubPage>
  );
}
