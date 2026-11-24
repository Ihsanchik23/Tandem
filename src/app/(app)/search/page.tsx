import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalog } from "@/components/catalog/Catalog";
import { StubPage } from "@/components/layout/StubPage";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.catalog.title} — ${t.app.name}` };

export default function SearchPage() {
  return (
    <StubPage title={t.catalog.title}>
      <Suspense fallback={null}>
        <Catalog />
      </Suspense>
    </StubPage>
  );
}
