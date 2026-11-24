import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StubPage } from "@/components/layout/StubPage";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { FormFallback } from "@/components/auth/FormFallback";
import { getUserId } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export default function ProfileEditPage() {
  return (
    <StubPage title={t.profileEdit.title}>
      <Suspense fallback={<FormFallback />}>
        <EditContent />
      </Suspense>
    </StubPage>
  );
}

async function EditContent() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("id, username, first_name, last_name, avatar_url, bio, city")
    .eq("id", userId)
    .maybeSingle();
  if (!p) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <AvatarUploader userId={p.id} name={`${p.first_name} ${p.last_name}`} initialUrl={p.avatar_url} />
      <ProfileEditForm
        cancelHref={`/@${p.username}`}
        initial={{
          first_name: p.first_name,
          last_name: p.last_name,
          username: p.username,
          city: p.city ?? "",
          bio: p.bio ?? "",
        }}
      />
    </div>
  );
}
