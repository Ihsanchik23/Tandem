"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { requestPasswordReset, type AuthFormState } from "@/lib/auth/actions";
import { t } from "@/lib/i18n";
import { FormMessage } from "@/components/ui/FormMessage";
import { AuthButton, AuthField } from "./AuthField";
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

      <form action={action} className="flex flex-col gap-3.5" noValidate>
        <AuthField
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
        {error ? (
          <FormMessage kind="error" compact>
            {error}
          </FormMessage>
        ) : null}
        <AuthButton type="submit" pending={pending} pendingText={t.auth.forgot.pending}>
          {t.auth.forgot.submit}
        </AuthButton>
      </form>

      <p className="auth-prompt auth-bottom">
        <Link href="/login">{t.auth.forgot.backToLogin}</Link>
      </p>
    </>
  );
}
