"use client";

import { useActionState } from "react";
import { updatePassword, type AuthFormState } from "@/lib/auth/actions";
import { t } from "@/lib/i18n";
import { FormMessage } from "@/components/ui/FormMessage";
import { AuthButton, AuthField } from "./AuthField";
import { AuthHeader } from "./AuthHeader";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(updatePassword, {});

  return (
    <>
      <AuthHeader title={t.auth.reset.title} subtitle={t.auth.reset.subtitle} />

      <form action={action} className="flex flex-col gap-3.5" noValidate>
        <AuthField
          label={t.auth.fields.newPassword}
          name="password"
          password
          autoComplete="new-password"
          minLength={8}
          required
          hint={t.auth.fields.passwordHint}
        />
        <AuthField
          label={t.auth.fields.confirmPassword}
          name="confirm_password"
          password
          autoComplete="new-password"
          minLength={8}
          required
        />
        {state.error ? (
          <FormMessage kind="error" compact>
            {t.errors[state.error]}
          </FormMessage>
        ) : null}
        <AuthButton type="submit" pending={pending} pendingText={t.auth.reset.pending}>
          {t.auth.reset.submit}
        </AuthButton>
      </form>
    </>
  );
}
