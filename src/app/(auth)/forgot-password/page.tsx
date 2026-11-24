import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { FormFallback } from "@/components/auth/FormFallback";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.auth.forgot.title} — ${t.app.name}` };

export default function Page() {
  return (
    <Suspense fallback={<FormFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
