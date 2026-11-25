import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalog } from "@/components/catalog/Catalog";
import { PreviewLinks } from "@/components/catalog/PreviewLinks";
import { SearchHero } from "@/components/catalog/SearchHero";
import { CompanyView } from "@/components/company/CompanyView";
import { ProfileView } from "@/components/profile/ProfileView";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.catalog.title} — ${t.app.name}` };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="flex min-h-0 flex-1 flex-col md:h-dvh md:flex-row md:overflow-hidden">
      <section aria-label={t.catalog.title} className="flex min-w-0 flex-col px-4 pb-8 pt-5 md:w-[400px] md:shrink-0 md:overflow-y-auto md:border-r-[0.5px] md:border-neutral-300 md:px-5 md:pt-8 xl:w-[460px]">
        <h1 className="mb-5 text-2xl font-semibold tracking-tight text-ink">{t.catalog.title}</h1>
        <Suspense fallback={null}>
          <Catalog />
        </Suspense>
      </section>
      <section aria-label={t.catalog.previewLabel} className="hidden min-w-0 flex-1 overflow-y-auto md:flex">
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-neutral-50" />}>
          <PreviewLinks>
            <SearchPreview searchParams={searchParams} />
          </PreviewLinks>
        </Suspense>
      </section>
    </main>
  );
}

async function SearchPreview({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const { person, company } = await searchParams;
  if (typeof company === "string" && company.length > 0 && company.length <= 80) {
    return <CompanyView slug={company} embedded />;
  }
  if (typeof person === "string" && person.length > 0 && person.length <= 80) {
    return <ProfileView username={person} embedded />;
  }
  return <SearchHero />;
}
