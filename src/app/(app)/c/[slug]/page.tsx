import { Suspense } from "react";
import { CompanyView } from "@/components/company/CompanyView";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";

// Профиль компании: /c/<slug>.
export default function CompanyPage({ params }: PageProps<"/c/[slug]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <CompanyContent params={params} />
    </Suspense>
  );
}

async function CompanyContent({ params }: { params: PageProps<"/c/[slug]">["params"] }) {
  const { slug } = await params;
  return <CompanyView slug={decodeURIComponent(slug)} />;
}
