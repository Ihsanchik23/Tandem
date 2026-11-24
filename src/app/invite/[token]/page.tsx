import { Suspense } from "react";
import { FormFallback } from "@/components/auth/FormFallback";
import { InvitePreview } from "@/components/invite/InvitePreview";

// /invite/<token> — предпросмотр приглашения (ТЗ, раздел 9). Открыт без входа (proxy: isPublicPath).
export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <Suspense fallback={<FormFallback />}>
      <InviteContent params={params} />
    </Suspense>
  );
}

async function InviteContent({ params }: { params: PageProps<"/invite/[token]">["params"] }) {
  const { token } = await params;
  return <InvitePreview token={decodeURIComponent(token)} />;
}
