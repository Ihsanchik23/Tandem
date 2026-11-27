"use client";

import { Archive, Buildings, MagnifyingGlass, Plus, TreeStructure, Users } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { leaveCompany } from "@/lib/company/actions";
import { t } from "@/lib/i18n";
import type { ShellData } from "@/lib/nav/shell";
import { Avatar } from "@/components/profile/Avatar";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { Group, GroupCard as Card, Row } from "@/components/ui/Grouped";
import { GROUPED_BG } from "@/components/ui/groupedStyle";
import { PageIcon } from "@/components/ui/PageIcon";
import { useMyChats } from "@/modules/chat/chats";
import { badgeText } from "@/modules/chat/logic";
import { canCreatePage, isNewPage } from "@/modules/pages/logic";
import { newPageHref, openNewPage } from "@/modules/pages/newPage";
import { NewBadge } from "@/modules/pages/PagesList";
import { useSeenPages } from "@/modules/pages/seen";

// Фон панели — светло-серый, группы — белые карточки (как настройки WhatsApp на iOS).
export const PANEL_BG = GROUPED_BG;
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
          <Row chevron href="/search" onClick={onNavigate} icon={<MagnifyingGlass size={ICON} />} label={w.findCompany} />
          <Row chevron href="/work/new" onClick={onNavigate} icon={<Plus size={ICON} />} label={w.createCompany} />
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
      {/* Кнопка «свернуть» (WorkPanel) лежит поверх справа отдельным элементом — нажатие на неё сюда не попадает. */}
      <div className="shrink-0 px-3 pb-1 pt-4">
        <Link
          href="/work"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl bg-white p-2.5 pr-12 transition-colors hover:bg-[#f7f7f7] active:bg-[#efefef]"
        >
          <span className="overflow-hidden rounded-[10px]">
            <Avatar url={company.logoUrl} name={company.name} size={40} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold leading-tight text-ink">{company.name}</span>
            <span className="block truncate text-[13px] text-muted">{t.company.roles[company.role]}</span>
          </span>
        </Link>
      </div>

      {/* Карточка компании стоит на месте; строки прокручиваются под ней и мягко гаснут у её края. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
      <span aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-5 bg-gradient-to-b from-[#f2f2f7] to-transparent`} />
      {/* Полоса прокрутки скрыта: не отнимает ширину, правые края всех карточек совпадают. */}
      <nav
        aria-label={w.menu}
        className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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
                <Row chevron
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
            <Row chevron key={l.href} href={l.href} onClick={onNavigate} active={pathname.startsWith(l.href)} icon={l.icon} label={l.label} />
          ))}
        </Group>

        {/* «Прочее» — служебные страницы, не рабочие и не «Моя компания». */}
        <Group title={w.menuOther}>
          <Row chevron
            href="/work/archive"
            onClick={onNavigate}
            active={pathname.startsWith("/work/archive")}
            icon={<Archive size={ICON} />}
            label={w.menuArchive}
          />
        </Group>
      </nav>
      </div>

      <div className="px-3 pb-5">
        {company.role === "owner" ? (
          <p className="px-3.5 text-[12px] text-muted">{w.ownerCannotLeaveHint}</p>
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
