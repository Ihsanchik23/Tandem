"use client";

import { Archive, Buildings, CaretRight, MagnifyingGlass, Plus, TreeStructure, Users } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { leaveCompany } from "@/lib/company/actions";
import { t } from "@/lib/i18n";
import type { ShellData } from "@/lib/nav/shell";
import { Avatar } from "@/components/profile/Avatar";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { PageIcon } from "@/components/ui/PageIcon";
import { useMyChats } from "@/modules/chat/chats";
import { badgeText } from "@/modules/chat/logic";
import { canCreatePage, isNewPage } from "@/modules/pages/logic";
import { newPageHref, openNewPage } from "@/modules/pages/newPage";
import { NewBadge } from "@/modules/pages/PagesList";
import { useSeenPages } from "@/modules/pages/seen";

// Фон панели — светло-серый, группы — белые карточки (как настройки WhatsApp на iOS).
export const PANEL_BG = "bg-[#f2f2f7]";
const ICON = 22;

// Панель компании: карточка компании и группы «Рабочие страницы», «Моя компания», «Прочее».
// Строка: иконка, название, справа счётчик непрочитанного (чаты) или «Новая», шеврон.
// На компьютере — постоянная панель в «Работе», на телефоне — выдвижное меню слева.
export function CompanyPanel({ data, onNavigate }: { data: ShellData; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const seen = useSeenPages();
  const { chats } = useMyChats();
  const w = t.work;

  if (!data.company) {
    return (
      <div className={`flex h-full flex-col gap-2 px-3 py-4 ${PANEL_BG}`}>
        <p className="px-4 pb-1 text-[15px] font-semibold text-ink">{w.noCompanyTitle}</p>
        <Card>
          <Row href="/search" onClick={onNavigate} icon={<MagnifyingGlass size={ICON} />} label={w.findCompany} />
          <Row href="/work/new" onClick={onNavigate} icon={<Plus size={ICON} />} label={w.createCompany} />
        </Card>
      </div>
    );
  }

  const { company, pages } = data;
  const unread = new Map((chats ?? []).map((c) => [c.pageId, c.unread]));
  const links = [
    { href: `/c/${company.slug}`, label: w.menuProfile, icon: <Buildings size={ICON} /> },
    { href: "/work/structure", label: w.menuStructure, icon: <TreeStructure size={ICON} /> },
    { href: "/work/people", label: w.menuPeople, icon: <Users size={ICON} /> },
  ];

  return (
    <div className={`flex h-full flex-col ${PANEL_BG}`}>
      {/* Карточка компании: логотип, название, моя роль. Справа — место под кнопку «свернуть». */}
      <div className="px-3 pb-1 pt-4">
        <div className="flex items-center gap-3 rounded-xl bg-white p-2.5 pr-12">
          <span className="overflow-hidden rounded-[10px]">
            <Avatar url={company.logoUrl} name={company.name} size={40} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold leading-tight text-ink">{company.name}</span>
            <span className="block truncate text-[13px] text-muted">{t.company.roles[company.role]}</span>
          </span>
        </div>
      </div>

      <nav aria-label={w.menu} className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-3 pt-4">
        <Group
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
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5 active:bg-black/10"
              >
                <Plus size={18} />
              </a>
            ) : null
          }
        >
          {pages.length === 0 ? (
            <p className="px-4 py-3 text-[14px] text-muted">{w.noPages}</p>
          ) : (
            pages.map((p) => {
              const n = p.moduleKey === "chat" ? (unread.get(p.id) ?? 0) : 0;
              return (
                <Row
                  key={p.id}
                  href={`/work/p/${p.id}`}
                  onClick={onNavigate}
                  active={pathname.startsWith(`/work/p/${p.id}`)}
                  icon={<PageIcon moduleKey={p.moduleKey} size={ICON} />}
                  label={p.name}
                  right={
                    n > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[12px] font-semibold tabular-nums text-white">
                        {badgeText(n)}
                      </span>
                    ) : seen && isNewPage(p, seen) ? (
                      <NewBadge />
                    ) : null
                  }
                />
              );
            })
          )}
        </Group>

        <Group title={w.menuMyCompany}>
          {links.map((l) => (
            <Row key={l.href} href={l.href} onClick={onNavigate} active={pathname.startsWith(l.href)} icon={l.icon} label={l.label} />
          ))}
        </Group>

        {/* «Прочее» — служебные страницы, не рабочие и не «Моя компания». */}
        <Group title={w.menuOther}>
          <Row
            href="/work/archive"
            onClick={onNavigate}
            active={pathname.startsWith("/work/archive")}
            icon={<Archive size={ICON} />}
            label={w.menuArchive}
          />
        </Group>
      </nav>

      <div className="px-3 pb-4 pt-2">
        {company.role === "owner" ? (
          <p className="px-4 text-[12px] text-muted">{w.ownerCannotLeaveHint}</p>
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

// Группа: подпись мелким серым над белой карточкой, справа от подписи — необязательное действие («+»).
function Group({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="flex h-7 items-center justify-between pl-4 pr-1 text-[12px] font-medium uppercase tracking-[0.04em] text-neutral-500">
        {title}
        {action}
      </h2>
      <Card>{children}</Card>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl bg-white">{children}</div>;
}

// Строка как в настройках iOS: разделитель начинается от текста, у последней строки его нет.
function Row({
  href,
  onClick,
  active = false,
  icon,
  label,
  right,
}: {
  href: string;
  onClick?: () => void;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 pl-3.5 text-ink transition-colors ${active ? "bg-black/[0.06]" : "hover:bg-black/[0.03] active:bg-black/[0.06]"}`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-ink">{icon}</span>
      <span className="flex min-h-12 min-w-0 flex-1 items-center gap-2 border-b-[0.5px] border-neutral-200 pr-3 group-last:border-b-0">
        <span className={`min-w-0 flex-1 truncate text-[15px] ${active ? "font-medium" : ""}`}>{label}</span>
        {right}
        <CaretRight size={16} weight="bold" className="shrink-0 text-neutral-300" aria-hidden />
      </span>
    </Link>
  );
}
