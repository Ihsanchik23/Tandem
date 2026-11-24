"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { requestPasswordReset, type AuthFormState } from "@/lib/auth/actions";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { AuthHeader } from "./AuthHeader";
import { errorFromParam } from "./messages";

export function ForgotPasswordForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, {});
  const error = state.error ? t.errors[state.error] : errorFromParam(params.get("error"));
  // Email из формы после ошибки или из адреса (?email=, например со страницы регистрации).
  const email = state.values?.email ?? params.get("email") ?? "";

  return (
    <>
      <AuthHeader title={t.auth.forgot.title} subtitle={t.auth.forgot.subtitle} />
      {error ? <FormMessage kind="error">{error}</FormMessage> : null}

      <form action={action} className="flex flex-col gap-4" noValidate>
        <TextField
          label={t.auth.fields.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          defaultValue={email}
          key={`email-${email}`}
        />
        <Button type="submit" pending={pending} pendingText={t.auth.forgot.pending}>
          {t.auth.forgot.submit}
        </Button>
      </form>

      <p className="text-center">
        <Link href="/login" className="text-base font-medium text-accent underline underline-offset-4">
          {t.auth.forgot.backToLogin}
        </Link>
      </p>
    </>
  );
}
