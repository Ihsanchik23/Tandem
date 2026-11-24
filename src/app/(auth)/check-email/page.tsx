import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckEmail } from "@/components/auth/CheckEmail";
import { FormFallback } from "@/components/auth/FormFallback";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.auth.checkEmail.title} — ${t.app.name}` };

export default function Page() {
  return (
    <Suspense fallback={<FormFallback />}>
      <CheckEmail />
    </Suspense>
  );
}
