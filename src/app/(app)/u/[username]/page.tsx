import { Suspense } from "react";
import { ProfileView } from "@/components/profile/ProfileView";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";

// Открывается по адресу /@username (переадресация в next.config.ts).
export default function ProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent params={params} />
    </Suspense>
  );
}

async function ProfileContent({ params }: { params: PageProps<"/u/[username]">["params"] }) {
  const { username } = await params;
  return <ProfileView username={decodeURIComponent(username)} />;
}
