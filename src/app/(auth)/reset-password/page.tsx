import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { FormFallback } from "@/components/auth/FormFallback";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.auth.reset.title} — ${t.app.name}` };

export default function Page() {
  return (
    <Suspense fallback={<FormFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
