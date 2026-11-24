import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getUserId } from "@/lib/auth/session";
import { canEditCompany } from "@/lib/company/permissions";
import { getMembers, getMyCompany } from "@/lib/company/queries";
import { t } from "@/lib/i18n";
import { CanvasView } from "@/modules/canvas/CanvasView";
import { getStructure } from "@/modules/canvas/queries";

// «Моя компания → Структура» (Canvas). Видят все сотрудники, меняют Owner и Admin.
export default function StructurePage() {
  return (
    // Телефон: экран минус шапка (3.5rem) и нижняя панель (4rem). Компьютер: весь экран.
    <main className="flex h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom)-env(safe-area-inset-top))] flex-col md:h-dvh">
      {/* На телефоне заголовок — в общей шапке. */}
      <header className="hidden items-center gap-3 border-b border-neutral-200 bg-white px-5 py-3 md:flex">
        <Link href="/work" className="text-base text-neutral-600 underline-offset-4 hover:underline">
          ← {t.work.title}
        </Link>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t.canvas.title}</h1>
      </header>
      <div className="relative flex-1">
        <Suspense fallback={<div className="h-full w-full bg-neutral-50" aria-hidden />}>
          <StructureContent />
        </Suspense>
      </div>
    </main>
  );
}

async function StructureContent() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const company = await getMyCompany(userId);
  if (!company) redirect("/work");

  const [structure, people] = await Promise.all([getStructure(company.org.id), getMembers(company.org.id)]);
  return (
    <CanvasView
      organization={{ id: company.org.id, name: company.org.name, logoUrl: company.org.logo_url }}
      units={structure.units}
      unitMembers={structure.unitMembers}
      people={people}
      canEdit={canEditCompany(company.role)}
    />
  );
}
