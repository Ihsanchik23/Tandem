import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { FormFallback } from "@/components/auth/FormFallback";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.auth.pageTitles.login} — ${t.app.name}` };

export default function Page() {
  return (
    <Suspense fallback={<FormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
