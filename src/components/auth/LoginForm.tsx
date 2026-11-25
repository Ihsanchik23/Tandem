"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthFormState } from "@/lib/auth/actions";
import { safeNext, withNext } from "@/lib/auth/redirect";
import { t } from "@/lib/i18n";
import { FormMessage } from "@/components/ui/FormMessage";
import { AuthButton, AuthField } from "./AuthField";
import { AuthHeader } from "./AuthHeader";
import { GoogleButton } from "./GoogleButton";
import { errorFromParam } from "./messages";

const NOTICES = { emailConfirmed: t.auth.notices.emailConfirmed } as const;

// next — куда вернуть после входа, если его нет в адресе (гостевой экран раздела на компьютере).
export function LoginForm({ next: nextProp }: { next?: string } = {}) {
  const params = useSearchParams();
  const next = safeNext(params.get("next")) ?? safeNext(nextProp);
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {});

  const noticeKey = params.get("notice");
  const notice = noticeKey && noticeKey in NOTICES ? NOTICES[noticeKey as keyof typeof NOTICES] : null;
  const error = state.error ? t.errors[state.error] : errorFromParam(params.get("error"));
  // Email из формы после ошибки или из адреса (?email=, например со страницы регистрации).
  const email = state.values?.email ?? params.get("email") ?? "";

  return (
    <>
      <AuthHeader title={t.auth.login.title} subtitle={t.auth.login.subtitle} />

      <form action={action} className="flex flex-col gap-3.5" noValidate>
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
          key={`email-${email}`}
        />
        <AuthField label={t.auth.fields.password} name="password" password autoComplete="current-password" required />

        {notice && !state.error ? (
          <FormMessage kind="notice" compact>
            {notice}
          </FormMessage>
        ) : null}
        {error ? (
          <FormMessage kind="error" compact>
            {error}
            {state.error === "emailNotConfirmed" && email ? (
              <>
                {" "}
                <Link
                  href={`/check-email?${new URLSearchParams({ kind: "signup", email, ...(next ? { next } : {}) })}`}
                  className="font-medium underline"
                >
                  {t.auth.login.resendConfirmation}
                </Link>
              </>
            ) : null}
          </FormMessage>
        ) : null}

        <AuthButton type="submit" pending={pending} pendingText={t.auth.login.pending}>
          {t.auth.login.submit}
        </AuthButton>
        <Link href="/forgot-password" className="auth-forgot">
          {t.auth.login.forgot}
        </Link>
      </form>

      <GoogleButton />

      <p className="auth-prompt auth-bottom">
        {t.auth.login.noAccount} <Link href={withNext("/signup", next)}>{t.auth.login.toSignup}</Link>
      </p>
    </>
  );
}
