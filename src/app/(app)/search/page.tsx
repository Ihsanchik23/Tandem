import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalog } from "@/components/catalog/Catalog";
import { PreviewLinks } from "@/components/catalog/PreviewLinks";
import { GuestGate } from "@/components/guest/GuestGate";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { CompanyView } from "@/components/company/CompanyView";
import { ListDetailLayout } from "@/components/layout/ListDetailLayout";
import { ProfileView } from "@/components/profile/ProfileView";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.catalog.title} — ${t.app.name}` };

// Без входа — гостевой экран (содержимое поиска не рендерится и данных не запрашивает).
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={null}>
      <GuestGate section="search">
        <SearchContent searchParams={searchParams} />
      </GuestGate>
    </Suspense>
  );
}

function SearchContent({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  return (
    <ListDetailLayout
      title={t.catalog.title}
      detailLabel={t.catalog.previewLabel}
      list={
        <Suspense fallback={null}>
          <Catalog />
        </Suspense>
      }
      detail={
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-neutral-50" />}>
          <PreviewLinks>
            <SearchPreview searchParams={searchParams} />
          </PreviewLinks>
        </Suspense>
      }
    />
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
  return (
    <HeroPanel
      src="/images/search/search-hero.jpg"
      width={1760}
      height={2352}
      alt={t.catalog.heroAlt}
      title={t.catalog.emptyPreviewTitle}
      // Колонка = экран минус меню слева (64px) и список (400px, с 1280px — 460px).
      sizes="(min-width: 1280px) calc(100vw - 524px), calc(100vw - 464px)"
      objectPosition="50% 30%"
    />
  );
}
