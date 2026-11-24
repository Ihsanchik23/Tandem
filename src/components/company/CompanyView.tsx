import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserId } from "@/lib/auth/session";
import { canEditCompany, getMembers } from "@/lib/company/queries";
import { pluralRu, t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/profile/Avatar";
import { MemberRow } from "./MemberRow";

// Публичный профиль компании (ТЗ, раздел 7): логотип, название, описание, основатели,
// город, число и список сотрудников. Видят все вошедшие (RLS: organizations_select).
export async function CompanyView({ slug }: { slug: string }) {
  const supabase = await createClient();
  const [{ data: org }, myId] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, slug, name, description, city, logo_url, organization_founders(profiles(username, first_name, last_name))")
      .eq("slug", slug.toLowerCase())
      .maybeSingle(),
    getUserId(),
  ]);
  if (!org) notFound();

  const members = await getMembers(org.id);
  const me = members.find((m) => m.user_id === myId);
  const founders = org.organization_founders.flatMap((f) => (f.profiles ? [f.profiles] : []));
  const c = t.company;

  return (
    <main className="flex flex-1 flex-col px-5 pb-8 pt-6 md:pt-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar url={org.logo_url} name={org.name} size={96} alt={c.logoAlt} />
          <div className="flex flex-col gap-0.5">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-ink">{org.name}</h1>
            <p className="text-base text-ink">
              {[org.city, `${members.length} ${pluralRu(members.length, c.members)}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {canEditCompany(me?.role) ? (
          <Link
            href={`/c/${org.slug}/edit`}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-base font-medium text-ink hover:bg-neutral-50"
          >
            {c.edit}
          </Link>
        ) : null}

        {org.description ? (
          <p className="whitespace-pre-line break-words text-base text-ink">{org.description}</p>
        ) : null}

        {founders.length > 0 ? (
          <section className="flex flex-col gap-1">
            <h2 className="text-sm font-medium text-ink">{c.founders}</h2>
            <p className="text-base text-ink">
              {founders.map((f, i) => (
                <span key={f.username}>
                  {i > 0 ? ", " : null}
                  <Link href={`/@${f.username}`} className="underline-offset-4 hover:underline">
                    {`${f.first_name} ${f.last_name}`.trim()}
                  </Link>
                </span>
              ))}
            </p>
          </section>
        ) : null}

        <section className="flex flex-col">
          <h2 className="text-sm font-medium text-ink">{c.people}</h2>
          <ul className="divide-y divide-neutral-100">
            {members.map((m) => (
              <MemberRow key={m.user_id} m={m} />
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
