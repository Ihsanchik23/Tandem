"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signUp, type AuthFormState } from "@/lib/auth/actions";
import { safeNext, withNext } from "@/lib/auth/redirect";
import { prefillUrl } from "@/lib/auth/signup";
import { t } from "@/lib/i18n";
import { FormMessage } from "@/components/ui/FormMessage";
import { AuthButton, AuthField } from "./AuthField";
import { AuthHeader } from "./AuthHeader";
import { GoogleButton } from "./GoogleButton";

// Регистрация: только email и пароль. Имя и фамилию сервер берёт из адреса почты
// (lib/auth/name-from-email.ts), человек потом меняет их в профиле.
export function SignupForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, {});
  const email = state.values?.email ?? "";

  return (
    <>
      <AuthHeader title={t.auth.signup.title} subtitle={t.auth.signup.subtitle} />

      <form action={action} className="flex flex-col gap-3.5" noValidate key={email}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <AuthField
          label={t.auth.fields.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          defaultValue={email}
        />
        <AuthField
          label={t.auth.fields.password}
          name="password"
          password
          autoComplete="new-password"
          minLength={8}
          required
          hint={t.auth.fields.passwordHint}
        />

        {state.error ? (
          <FormMessage kind="error" compact>
            {t.errors[state.error]}
            {state.error === "emailTaken" ? (
              <>
                {". "}
                <Link href={prefillUrl("/login", email, next)} className="font-medium underline">
                  {t.auth.signup.toLogin}
                </Link>
                {" · "}
                <Link href={prefillUrl("/forgot-password", email, null)} className="font-medium underline">
                  {t.auth.login.forgot}
                </Link>
              </>
            ) : null}
          </FormMessage>
        ) : null}

        <AuthButton type="submit" pending={pending} pendingText={t.auth.signup.pending}>
          {t.auth.signup.submit}
        </AuthButton>
      </form>

      <GoogleButton />

      <p className="auth-prompt auth-bottom">
        {t.auth.signup.haveAccount} <Link href={withNext("/login", next)}>{t.auth.signup.toLogin}</Link>
      </p>
    </>
  );
}
