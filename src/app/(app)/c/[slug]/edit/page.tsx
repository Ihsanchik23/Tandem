import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { StubPage } from "@/components/layout/StubPage";
import { FormFallback } from "@/components/auth/FormFallback";
import { CompanyForm } from "@/components/company/CompanyForm";
import { LogoUploader } from "@/components/company/LogoUploader";
import { getUserId } from "@/lib/auth/session";
import { canEditCompany } from "@/lib/company/queries";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

// Редактирование профиля компании (Owner/Admin). Кнопка скрыта у остальных,
// но защищает не она, а RLS: чужую строку organizations база не изменит.
export default function CompanyEditPage({ params }: PageProps<"/c/[slug]/edit">) {
  return (
    <StubPage title={t.company.editTitle}>
      <Suspense fallback={<FormFallback />}>
        <EditContent params={params} />
      </Suspense>
    </StubPage>
  );
}

async function EditContent({ params }: { params: PageProps<"/c/[slug]/edit">["params"] }) {
  const { slug } = await params;
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, name, city, description, logo_url")
    .eq("slug", decodeURIComponent(slug).toLowerCase())
    .maybeSingle();
  if (!org) notFound();

  const { data: me } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!canEditCompany(me?.role)) redirect(`/c/${org.slug}`);

  return (
    <div className="flex flex-col gap-6">
      <LogoUploader organizationId={org.id} name={org.name} initialUrl={org.logo_url} />
      <CompanyForm
        mode="edit"
        organizationId={org.id}
        cancelHref={`/c/${org.slug}`}
        initial={{ name: org.name, slug: org.slug, city: org.city ?? "", description: org.description ?? "" }}
      />
    </div>
  );
}
