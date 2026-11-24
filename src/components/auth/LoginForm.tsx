"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthFormState } from "@/lib/auth/actions";
import { safeNext, withNext } from "@/lib/auth/redirect";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { AuthHeader } from "./AuthHeader";
import { errorFromParam } from "./messages";

const NOTICES = { emailConfirmed: t.auth.notices.emailConfirmed } as const;

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {});

  const noticeKey = params.get("notice");
  const notice = noticeKey && noticeKey in NOTICES ? NOTICES[noticeKey as keyof typeof NOTICES] : null;
  const error = state.error ? t.errors[state.error] : errorFromParam(params.get("error"));
  // Email из формы после ошибки или из адреса (?email=, например со страницы регистрации).
  const email = state.values?.email ?? params.get("email") ?? "";

  return (
    <>
      <AuthHeader title={t.auth.login.title} subtitle={t.auth.login.subtitle} />
      {notice && !state.error ? <FormMessage kind="notice">{notice}</FormMessage> : null}
      {error ? (
        <FormMessage kind="error">
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

      <form action={action} className="flex flex-col gap-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
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
        <TextField
          label={t.auth.fields.password}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-sm font-medium text-neutral-700 underline-offset-4 hover:underline">
            {t.auth.login.forgot}
          </Link>
        </div>
        <Button type="submit" pending={pending} pendingText={t.auth.login.pending}>
          {t.auth.login.submit}
        </Button>
      </form>

      <p className="text-center text-base text-neutral-600">
        {t.auth.login.noAccount}{" "}
        <Link href={withNext("/signup", next)} className="font-medium text-accent underline underline-offset-4">
          {t.auth.login.toSignup}
        </Link>
      </p>
    </>
  );
}
