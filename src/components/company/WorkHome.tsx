import Link from "next/link";
import { t } from "@/lib/i18n";
import { ArrowRightIcon } from "@/components/nav/icons";
import { canCreatePage } from "@/modules/pages/logic";
import { PagesList, type ListPage } from "@/modules/pages/PagesList";
import type { MyCompany } from "@/lib/company/queries";

const btnPrimary =
  "inline-flex h-12 items-center justify-center rounded-xl bg-brand px-4 text-base font-medium text-white hover:bg-brand-hover";
const btnSecondary =
  "inline-flex h-12 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-base font-medium text-ink hover:bg-neutral-50";

// «Работа», если компании нет (ТЗ, раздел 15).
export function NoCompany({ canCreate }: { canCreate: boolean }) {
  const w = t.work;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-lg font-medium text-ink">{w.noCompanyTitle}</p>
        <p className="text-base text-ink">{w.noCompanyText}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href="/search" className={btnSecondary}>
          {w.findCompany}
        </Link>
        {canCreate ? (
          <Link href="/work/new" className={btnPrimary}>
            {w.createCompany}
          </Link>
        ) : (
          <>
            <span aria-disabled className={`${btnPrimary} cursor-not-allowed opacity-40`}>
              {w.createCompany}
            </span>
            <p className="text-sm text-ink">{w.needSubscription}</p>
          </>
        )}
      </div>
    </div>
  );
}

// «Работа», если компания есть: быстрый старт для Owner и рабочие страницы.
// Компания и меню — в панели слева (компьютер) и в выдвижном меню из шапки (телефон).
export function WorkHome({ company, pages }: { company: MyCompany; pages: ListPage[] }) {
  return (
    <div className="flex flex-col gap-8">
      {company.role === "owner" ? <QuickStart /> : null}
      <PagesList pages={pages} canCreate={canCreatePage(company.role)} />
    </div>
  );
}

// Панель быстрого старта для Owner (ТЗ, раздел 9).
function QuickStart() {
  const w = t.work;
  const ready =
    "flex items-center justify-between rounded-xl border border-neutral-300 px-4 py-3 text-base font-medium text-ink hover:bg-neutral-50";
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-ink">{w.quickStartTitle}</h2>
      <Link href="/work/structure" className={ready}>
        {w.quickStructure} <ArrowRightIcon className="h-5 w-5" />
      </Link>
      <Link href="/work/people" className={ready}>
        {w.quickInvite} <ArrowRightIcon className="h-5 w-5" />
      </Link>
      <Link href="/work/pages/new" className={ready}>
        {w.quickPage} <ArrowRightIcon className="h-5 w-5" />
      </Link>
    </section>
  );
}
