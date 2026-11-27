"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { leaveCompany } from "@/lib/company/actions";
import { t } from "@/lib/i18n";
import type { ShellData } from "@/lib/nav/shell";
import { Avatar } from "@/components/profile/Avatar";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { canCreatePage, isNewPage } from "@/modules/pages/logic";
import { NewBadge } from "@/modules/pages/PagesList";
import { useSeenPages } from "@/modules/pages/seen";
import { PageIcon } from "@/components/ui/PageIcon";
import { newPageHref, openNewPage } from "@/modules/pages/newPage";
import { PlusIcon } from "./icons";
import { SidebarGlyph, type SidebarGlyphKind } from "./SidebarGlyph";

// Панель компании: карточка компании, разделы мелкими заглавными, под ними страницы со значками.
// Разделы: «Рабочие страницы», «Моя компания», «Прочее» (архив).
// На компьютере — постоянная панель в «Работе», на телефоне — выдвижное меню слева.
export function CompanyPanel({ data, onNavigate }: { data: ShellData; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const seen = useSeenPages();
  const w = t.work;
  // На белой панели выбранный пункт выделяется светло-серой плашкой.
  const item = (active: boolean) =>
    `flex min-h-14 items-center gap-3 rounded-xl px-2.5 py-1.5 text-[14px] text-ink transition-colors ${
      active ? "bg-neutral-100 font-medium" : "hover:bg-neutral-50"
    }`;

  if (!data.company) {
    return (
      <div className="flex flex-col gap-1 p-4">
        <p className="px-2.5 pb-2 text-[15px] font-semibold text-ink">{w.noCompanyTitle}</p>
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
    { href: `/c/${company.slug}`, label: w.menuProfile, kind: "profile" },
    { href: "/work/structure", label: w.menuStructure, kind: "structure" },
    { href: "/work/people", label: w.menuPeople, kind: "people" },
  ] as const;

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Карточка компании: логотип, название, моя роль. */}
      <div className="px-3 pb-2 pt-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-neutral-100 bg-white p-2.5 pr-12 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <span className="overflow-hidden rounded-xl">
            <Avatar url={company.logoUrl} name={company.name} size={36} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold leading-tight text-ink">{company.name}</span>
            <span className="block truncate text-[12px] text-muted">{t.company.roles[company.role]}</span>
          </span>
        </div>
      </div>

      <nav aria-label={w.menu} className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">
        <Section
          title={w.menuPages}
          action={
            canCreatePage(company.role) ? (
              <a
                href={newPageHref(pathname)}
                onClick={(e) => {
                  onNavigate?.();
                  openNewPage(e);
                }}
                aria-label={t.pages.create}
                title={t.pages.create}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-neutral-100 hover:text-ink"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </a>
            ) : null
          }
        >
          {pages.length === 0 ? (
            <p className="px-2.5 py-1 text-[13px] text-muted">{w.noPages}</p>
          ) : (
            pages.map((p) => (
              <Link key={p.id} href={`/work/p/${p.id}`} onClick={onNavigate} className={item(pathname.startsWith(`/work/p/${p.id}`))}>
                <PageIcon moduleKey={p.moduleKey} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {seen && isNewPage(p, seen) ? <NewBadge /> : null}
              </Link>
            ))
          )}
        </Section>

        <Section title={w.menuMyCompany}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={onNavigate} className={item(pathname.startsWith(l.href))}>
              <RoundIcon tone="company" kind={l.kind} />
              {l.label}
            </Link>
          ))}
        </Section>

        {/* «Прочее» — отдельный раздел: служебные страницы, не рабочие и не «Моя компания». */}
        <Section title={w.menuOther}>
          <Link href="/work/archive" onClick={onNavigate} className={item(pathname.startsWith("/work/archive"))}>
            <RoundIcon tone="other" kind="archive" />
            {w.menuArchive}
          </Link>
        </Section>
      </nav>

      <div className="px-3 pb-4 pt-2">
        {company.role === "owner" ? (
          <p className="px-2.5 text-[12px] text-muted">{w.ownerCannotLeaveHint}</p>
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

const tones = {
  company: "var(--branch-3-line)",
  other: "var(--branch-2-line)",
} as const;

function RoundIcon({ tone, kind }: { tone: keyof typeof tones; kind: SidebarGlyphKind }) {
  const color = tones[tone];
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
      <SidebarGlyph kind={kind} cutout={color} />
    </span>
  );
}

// Раздел: название мелкими серыми заглавными, справа — необязательное действие («+»), ниже — пункты.
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-0.5">
      <h2 className="flex h-7 items-center justify-between px-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        {title}
        {action}
      </h2>
      {children}
    </section>
  );
}
