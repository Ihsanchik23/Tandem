import Link from "next/link";
import { t } from "@/lib/i18n";
import type { Member } from "@/lib/company/queries";
import { Avatar } from "@/components/profile/Avatar";

// Строка сотрудника: аватар, имя, должность и роль.
// Ведёт в профиль человека или, в разделе «Сотрудники», в карточку сотрудника.
export function MemberRow({ m, toCard = false }: { m: Member; toCard?: boolean }) {
  const name = `${m.first_name} ${m.last_name}`.trim();
  const meta = [m.position, t.company.roles[m.role]].filter(Boolean).join(" · ");
  return (
    <li>
      <Link href={toCard ? `/work/people/${m.user_id}` : `/@${m.username}`} className="flex items-center gap-3 py-3">
        <Avatar url={m.avatar_url} name={name} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium text-neutral-900">{name}</span>
          <span className="block truncate text-sm text-neutral-600">{meta}</span>
        </span>
      </Link>
    </li>
  );
}
