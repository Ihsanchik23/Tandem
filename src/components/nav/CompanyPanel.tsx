"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { leaveCompany } from "@/lib/company/actions";
import { t } from "@/lib/i18n";
import type { ShellData } from "@/lib/nav/shell";
import { Avatar } from "@/components/profile/Avatar";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { Collapse } from "@/components/ui/Collapse";
import { isNewPage } from "@/modules/pages/logic";
import { NewBadge } from "@/modules/pages/PagesList";
import { useSeenPages } from "@/modules/pages/seen";
import { ChatPageIcon, ChevronDownIcon, CompanyProfileIcon, PeopleIcon, StructureIcon, TasksPageIcon } from "./icons";

// Панель компании: компания, рабочие страницы, «Моя компания», выход.
// На компьютере — постоянная панель в «Работе», на телефоне — выдвижное меню слева.
export function CompanyPanel({ data, onNavigate }: { data: ShellData; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const seen = useSeenPages();
  const w = t.work;
  // Выбранный пункт: жирный шрифт и полоска с градиентом слева.
  const item = (active: boolean) =>
    `relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-base text-ink hover:bg-neutral-100 ${
      active
        ? "bg-neutral-100 font-semibold before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-brand"
        : ""
    }`;
  if (!data.company) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <p className="px-3 pb-2 text-base font-semibold text-ink">{w.noCompanyTitle}</p>
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
    { href: `/c/${company.slug}`, label: w.menuProfile, Icon: CompanyProfileIcon },
    { href: "/work/structure", label: w.menuStructure, Icon: StructureIcon },
    { href: "/work/people", label: w.menuPeople, Icon: PeopleIcon },
  ];

  return (
    <div className="flex h-full flex-col">
      <Link
        href={`/c/${company.slug}`}
        onClick={onNavigate}
        className="flex items-center gap-3 py-5 pl-5 pr-14"
      >
        <Avatar url={company.logoUrl} name={company.name} size={40} />
        <span className="min-w-0 truncate text-lg font-semibold text-ink">{company.name}</span>
      </Link>

      <nav aria-label={w.menu} className="flex flex-1 flex-col gap-7 overflow-y-auto p-4">
        <MenuSection key={`pages-${pathname}`} title={w.menuPages} initiallyOpen={!links.some((link) => pathname.startsWith(link.href))}>
          {pages.length === 0 ? (
            <p className="px-3 py-1 text-sm text-ink">{w.noPages}</p>
          ) : (
            pages.map((p) => (
              <Link key={p.id} href={`/work/p/${p.id}`} onClick={onNavigate} className={item(pathname.startsWith(`/work/p/${p.id}`))}>
                {p.moduleKey === "chat" ? <ChatPageIcon className="h-5 w-5 shrink-0" /> : <TasksPageIcon className="h-5 w-5 shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {seen && isNewPage(p, seen) ? <NewBadge /> : null}
              </Link>
            ))
          )}
        </MenuSection>

        <MenuSection key={`company-${pathname}`} title={w.menuMyCompany} initiallyOpen={links.some((link) => pathname.startsWith(link.href))}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={onNavigate} className={item(pathname.startsWith(l.href))}>
              <l.Icon className="h-5 w-5 shrink-0" />
              {l.label}
            </Link>
          ))}
        </MenuSection>
      </nav>

      <div className="p-4">
        {company.role === "owner" ? (
          <p className="px-1 text-sm text-ink">{w.ownerCannotLeaveHint}</p>
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

function MenuSection({ title, initiallyOpen, children }: { title: string; initiallyOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <section className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-neutral-100"
      >
        <span>{title}</span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
      </button>
      <Collapse open={open}>
        <div className="ml-3 flex flex-col gap-1 border-l border-neutral-200 pl-2">{children}</div>
      </Collapse>
    </section>
  );
}
