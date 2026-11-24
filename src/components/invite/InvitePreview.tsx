import Link from "next/link";
import { getUserId } from "@/lib/auth/session";
import { withNext } from "@/lib/auth/redirect";
import { invitePath } from "@/lib/company/invite";
import { getMyCompany } from "@/lib/company/queries";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Avatar } from "@/components/profile/Avatar";
import { JoinButton } from "./JoinButton";

const linkPrimary =
  "inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-base font-medium text-white hover:bg-brand-hover";

// Предпросмотр приглашения: логотип, название, «Присоединиться».
// get_invite_preview доступна и без входа; вступление проверяет accept_invite.
export async function InvitePreview({ token }: { token: string }) {
  const supabase = await createClient();
  const [{ data }, userId] = await Promise.all([
    supabase.rpc("get_invite_preview", { p_token: token }),
    getUserId(),
  ]);
  const preview = data?.[0];
  const i = t.invite;

  if (!preview || !preview.is_valid) {
    return (
      <>
        <AuthHeader title={i.invalidTitle} subtitle={i.invalidText} />
        <Link href={userId ? "/work" : "/login"} className="text-base font-medium text-accent underline underline-offset-4">
          {userId ? i.toWork : i.login}
        </Link>
      </>
    );
  }

  const company = userId ? await getMyCompany(userId) : null;
  const back = invitePath(token);

  return (
    <>
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar url={preview.logo_url} name={preview.name} size={96} alt={t.company.logoAlt} />
        <p className="text-base text-ink">{i.text}</p>
        <h1 className="break-words text-2xl font-semibold tracking-tight text-ink">{preview.name}</h1>
      </div>

      {!userId ? (
        <>
          <Link href={withNext("/signup", back)} className={linkPrimary}>
            {i.join}
          </Link>
          <p className="text-center text-base text-ink">
            {i.haveAccount}{" "}
            <Link href={withNext("/login", back)} className="font-medium text-accent underline underline-offset-4">
              {i.login}
            </Link>
          </p>
        </>
      ) : company?.org.id === preview.organization_id ? (
        <>
          <p className="text-center text-base text-ink">{i.alreadyHere}</p>
          <Link href="/work" className={linkPrimary}>
            {i.toWork}
          </Link>
        </>
      ) : company ? (
        <>
          <p className="text-center text-base text-ink">{i.otherCompany}</p>
          <Link href="/work" className={linkPrimary}>
            {i.toWork}
          </Link>
        </>
      ) : (
        <JoinButton token={token} />
      )}
    </>
  );
}
