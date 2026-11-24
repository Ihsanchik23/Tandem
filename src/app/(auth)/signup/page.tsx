import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";
import { FormFallback } from "@/components/auth/FormFallback";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.auth.signup.title} — ${t.app.name}` };

export default function Page() {
  return (
    <Suspense fallback={<FormFallback />}>
      <SignupForm />
    </Suspense>
  );
}
