import Link from "next/link";
import { notFound } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getUserId } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { isAutoUsername } from "@/lib/profile/validation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "./Avatar";

type Props = { username: string };

// Профиль человека (ТЗ, раздел 7). Видят все вошедшие пользователи (RLS: profiles_select).
export async function ProfileView({ username }: Props) {
  const supabase = await createClient();
  const [{ data: profile }, myId] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, first_name, last_name, avatar_url, bio, city")
      .eq("username", username.toLowerCase())
      .maybeSingle(),
    getUserId(),
  ]);
  if (!profile) notFound();

  // Места работы. В пилоте одно, но код не завязан на это правило.
  const { data: jobs } = await supabase
    .from("memberships")
    .select("position, organizations(id, slug, name, logo_url)")
    .eq("user_id", profile.id);

  const isMe = myId === profile.id;
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  return (
    <main className="flex flex-1 flex-col px-5 pb-8 pt-6 md:pt-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        {isMe && isAutoUsername(profile.username) ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-base font-medium text-amber-900">{t.profile.chooseUsernameTitle}</p>
            <p className="text-sm text-amber-900">{t.profile.chooseUsernameText}</p>
            <Link href="/profile/edit" className="text-sm font-medium text-amber-900 underline underline-offset-4">
              {t.profile.chooseUsernameCta}
            </Link>
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar url={profile.avatar_url} name={fullName} size={96} alt={t.profile.avatarAlt} />
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{fullName}</h1>
            <p className="text-base text-neutral-500">@{profile.username}</p>
            {profile.city ? <p className="text-base text-neutral-600">{profile.city}</p> : null}
          </div>
        </div>

        {profile.bio ? (
          <p className="whitespace-pre-line break-words text-base text-neutral-800">{profile.bio}</p>
        ) : null}

        {jobs && jobs.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-neutral-500">{t.profile.workplace}</h2>
            {jobs.map((job) =>
              job.organizations ? (
                <Link
                  key={job.organizations.id}
                  href={`/c/${job.organizations.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
                >
                  <Avatar url={job.organizations.logo_url} name={job.organizations.name} size={44} shape="rounded" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-neutral-900">{job.organizations.name}</p>
                    {job.position ? <p className="truncate text-sm text-neutral-600">{job.position}</p> : null}
                  </div>
                </Link>
              ) : null,
            )}
          </section>
        ) : null}

        {isMe ? (
          <div className="flex flex-col gap-3">
            <Link
              href="/profile/edit"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-neutral-900 px-4 text-base font-medium text-white hover:bg-neutral-800"
            >
              {t.profile.edit}
            </Link>
            <SignOutButton />
          </div>
        ) : null}
      </div>
    </main>
  );
}
