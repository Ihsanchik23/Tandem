import Link from "next/link";
import { t } from "@/lib/i18n";
import type { Member } from "@/lib/company/queries";
import { Avatar } from "@/components/profile/Avatar";

// Строка сотрудника: аватар, имя, должность и роль.
// Ведёт в профиль человека (страница компании).
export function MemberRow({ m }: { m: Member }) {
  const name = `${m.first_name} ${m.last_name}`.trim();
  const meta = [m.position, t.company.roles[m.role]].filter(Boolean).join(" · ");
  return (
    <li>
      <Link href={`/@${m.username}`} className="flex items-center gap-3 py-3">
        <Avatar url={m.avatar_url} name={name} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium text-ink">{name}</span>
          <span className="block truncate text-sm text-ink">{meta}</span>
        </span>
      </Link>
    </li>
  );
}
