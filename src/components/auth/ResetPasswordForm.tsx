"use client";

import { useActionState } from "react";
import { updatePassword, type AuthFormState } from "@/lib/auth/actions";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { PasswordField } from "@/components/ui/PasswordField";
import { AuthHeader } from "./AuthHeader";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(updatePassword, {});

  return (
    <>
      <AuthHeader title={t.auth.reset.title} subtitle={t.auth.reset.subtitle} />
      {state.error ? <FormMessage kind="error">{t.errors[state.error]}</FormMessage> : null}

      <form action={action} className="flex flex-col gap-4" noValidate>
        <PasswordField
          label={t.auth.fields.newPassword}
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
          hint={t.auth.fields.passwordHint}
        />
        <PasswordField
          label={t.auth.fields.confirmPassword}
          name="confirm_password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Button type="submit" pending={pending} pendingText={t.auth.reset.pending}>
          {t.auth.reset.submit}
        </Button>
      </form>
    </>
  );
}
