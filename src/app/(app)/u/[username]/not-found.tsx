import Link from "next/link";
import { StubPage } from "@/components/layout/StubPage";
import { t } from "@/lib/i18n";

export default function ProfileNotFound() {
  return (
    <StubPage title={t.profile.notFoundTitle}>
      <p className="text-base text-neutral-600">{t.profile.notFoundText}</p>
      <Link href="/search" className="text-base font-medium text-neutral-900 underline underline-offset-4">
        {t.profile.toSearch}
      </Link>
    </StubPage>
  );
}
