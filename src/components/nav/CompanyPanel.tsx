"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { leaveCompany } from "@/lib/company/actions";
import { t } from "@/lib/i18n";
import type { ShellData } from "@/lib/nav/shell";
import { Avatar } from "@/components/profile/Avatar";
import { ConfirmAction } from "@/components/ui/ConfirmAction";

// Значки модулей рабочих страниц.
function ModuleIcon({ moduleKey }: { moduleKey: string }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true };
  if (moduleKey === "chat") {
    return (
      <svg {...p}>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...p}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8.5 12 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Панель компании: компания, рабочие страницы, «Моя компания», выход.
// На компьютере — постоянная панель в «Работе», на телефоне — выдвижное меню слева.
export function CompanyPanel({ data, onNavigate }: { data: ShellData; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const w = t.work;
  const item = (active: boolean) =>
    `flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-[15px] ${
      active ? "bg-accent/10 font-medium text-accent" : "text-ink hover:bg-neutral-100"
    }`;

  if (!data.company) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-base font-medium text-ink">{w.noCompanyTitle}</p>
        <Link href="/search" onClick={onNavigate} className={item(false)}>
          {w.findCompany}
        </Link>
        <Link href="/work/new" onClick={onNavigate} className={item(false)}>
          {w.createCompany}
        </Link>
      </div>
    );
  }

  const { company, pages } = data;
  const links = [
    { href: `/c/${company.slug}`, label: w.menuProfile },
    { href: "/work/structure", label: w.menuStructure },
    { href: "/work/people", label: w.menuPeople },
  ];

  return (
    <div className="flex h-full flex-col">
      <Link
        href={`/c/${company.slug}`}
        onClick={onNavigate}
        className="flex items-center gap-3 border-b border-neutral-200 py-4 pl-4 pr-12"
      >
        <Avatar url={company.logoUrl} name={company.name} size={36} />
        <span className="min-w-0 truncate text-base font-semibold text-ink">{company.name}</span>
      </Link>

      <nav aria-label={w.menu} className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
        <section className="flex flex-col gap-0.5">
          <Link href="/work" onClick={onNavigate} className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-500 hover:text-ink">
            {w.menuPages}
          </Link>
          {pages.length === 0 ? (
            <p className="px-3 py-1 text-sm text-neutral-500">{w.noPages}</p>
          ) : (
            pages.map((p) => (
              // Открытие страниц появится вместе с модулями «Задачи» и «Чат» (день 5).
              <span key={p.id} className={item(false)}>
                <span className="text-neutral-500">
                  <ModuleIcon moduleKey={p.moduleKey} />
                </span>
                <span className="truncate">{p.name}</span>
              </span>
            ))
          )}
        </section>

        <section className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{w.menuMyCompany}</p>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={onNavigate} className={item(pathname.startsWith(l.href))}>
              {l.label}
            </Link>
          ))}
        </section>
      </nav>

      <div className="border-t border-neutral-200 p-3">
        {company.role === "owner" ? (
          <p className="px-1 text-sm text-neutral-500">{w.ownerCannotLeaveHint}</p>
        ) : (
          <ConfirmAction
            action={leaveCompany}
            label={w.leave}
            confirmText={w.leaveConfirm}
            yesLabel={w.leaveYes}
            pendingLabel={w.leaving}
          />
        )}
      </div>
    </div>
  );
}
