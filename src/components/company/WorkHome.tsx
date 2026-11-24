import Link from "next/link";
import { t } from "@/lib/i18n";
import type { MyCompany } from "@/lib/company/queries";
import { Avatar } from "@/components/profile/Avatar";

const btnPrimary =
  "inline-flex h-12 items-center justify-center rounded-xl bg-neutral-900 px-4 text-base font-medium text-white hover:bg-neutral-800";
const btnSecondary =
  "inline-flex h-12 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-base font-medium text-neutral-900 hover:bg-neutral-50";

// «Работа», если компании нет (ТЗ, раздел 15).
export function NoCompany({ canCreate }: { canCreate: boolean }) {
  const w = t.work;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-lg font-medium text-neutral-900">{w.noCompanyTitle}</p>
        <p className="text-base text-neutral-600">{w.noCompanyText}</p>
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
            <p className="text-sm text-neutral-600">{w.needSubscription}</p>
          </>
        )}
      </div>
    </div>
  );
}

// «Работа», если компания есть: шапка, меню компании, быстрый старт для Owner, рабочие страницы.
export function WorkHome({ company }: { company: MyCompany }) {
  const w = t.work;
  const { org } = company;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <CompanyMenu slug={org.slug} />
        <Link href={`/c/${org.slug}`} className="flex min-w-0 items-center gap-3">
          <Avatar url={org.logo_url} name={org.name} size={40} shape="rounded" />
          <span className="truncate text-xl font-semibold tracking-tight text-neutral-900">{org.name}</span>
        </Link>
      </div>

      {company.role === "owner" ? <QuickStart /> : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">{w.menuPages}</h2>
        <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-6 text-center text-base text-neutral-600">
          {w.noPages}
        </p>
      </section>
    </div>
  );
}

// Меню компании. На телефоне — кнопка-бургер; работает без JavaScript (details/summary).
function CompanyMenu({ slug }: { slug: string }) {
  const w = t.work;
  const item = "block rounded-lg px-3 py-2.5 text-base text-neutral-900 hover:bg-neutral-100";
  return (
    <details className="group relative">
      <summary
        aria-label={w.menu}
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-neutral-300 [&::-webkit-details-marker]:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </summary>
      <nav
        aria-label={w.menu}
        className="absolute left-0 top-12 z-20 w-64 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg"
      >
        <Link href="/work" className={item}>
          {w.menuPages}
        </Link>
        <p className="px-3 pb-1 pt-3 text-sm font-medium text-neutral-500">{w.menuMyCompany}</p>
        <Link href={`/c/${slug}`} className={item}>
          {w.menuProfile}
        </Link>
        <span className={`${item} text-neutral-400 hover:bg-transparent`}>
          {w.menuStructure} · {w.soon}
        </span>
        <Link href="/work/people" className={item}>
          {w.menuPeople}
        </Link>
      </nav>
    </details>
  );
}

// Панель быстрого старта для Owner (ТЗ, раздел 9). Ещё не готовые разделы — серые.
function QuickStart() {
  const w = t.work;
  const soon = "flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-400";
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-neutral-500">{w.quickStartTitle}</h2>
      <span className={soon}>
        {w.quickStructure} <span className="text-sm">{w.soon}</span>
      </span>
      <span className={soon}>
        {w.quickInvite} <span className="text-sm">{w.soon}</span>
      </span>
      <span className={soon}>
        {w.quickPage} <span className="text-sm">{w.soon}</span>
      </span>
    </section>
  );
}
