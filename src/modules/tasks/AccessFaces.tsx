// Кто имеет доступ к странице — стопкой аватаров в шапке (до пяти, дальше «+N»).
import { t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import type { PagePerson } from "./data";

export function AccessFaces({ people }: { people: PagePerson[] }) {
  if (people.length === 0) return null;
  const shown = people.slice(0, 5);
  const rest = people.length - shown.length;
  const names = people.map((p) => p.name).join(", ");
  return (
    <div className="flex items-center gap-2" title={`${t.tasks.accessTitle}: ${names}`}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{t.tasks.accessLabel}</span>
      <span className="flex items-center" aria-label={`${t.tasks.accessTitle}: ${names}`}>
        {shown.map((p, i) => (
          <span key={p.userId} className="rounded-full ring-2 ring-white" style={{ marginLeft: i === 0 ? 0 : -8 }}>
            <Avatar url={p.avatarUrl} name={p.name} size={30} />
          </span>
        ))}
        {rest > 0 ? (
          <span className="-ml-2 flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-surface px-1.5 text-[11px] font-semibold text-ink ring-2 ring-white">
            +{rest}
          </span>
        ) : null}
      </span>
    </div>
  );
}
