"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signUp, type AuthFormState } from "@/lib/auth/actions";
import { safeNext, withNext } from "@/lib/auth/redirect";
import { prefillUrl } from "@/lib/auth/signup";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { AuthHeader } from "./AuthHeader";

export function SignupForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, {});
  const v = state.values ?? {};
  const k = JSON.stringify(v);

  return (
    <>
      <AuthHeader title={t.auth.signup.title} subtitle={t.auth.signup.subtitle} />
      {state.error ? (
        <FormMessage kind="error">
          {t.errors[state.error]}
          {state.error === "emailTaken" ? (
            <>
              {". "}
              <Link href={prefillUrl("/login", v.email ?? "", next)} className="font-medium underline">
                {t.auth.signup.toLogin}
              </Link>
              {" · "}
              <Link href={prefillUrl("/forgot-password", v.email ?? "", null)} className="font-medium underline">
                {t.auth.login.forgot}
              </Link>
            </>
          ) : null}
        </FormMessage>
      ) : null}

      <form action={action} className="flex flex-col gap-4" noValidate key={k}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <TextField
          label={t.auth.fields.firstName}
          name="first_name"
          autoComplete="given-name"
          maxLength={60}
          required
          defaultValue={v.first_name ?? ""}
        />
        <TextField
          label={t.auth.fields.lastName}
          name="last_name"
          autoComplete="family-name"
          maxLength={60}
          required
          defaultValue={v.last_name ?? ""}
        />
        <TextField
          label={t.auth.fields.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          defaultValue={v.email ?? ""}
        />
        <TextField
          label={t.auth.fields.password}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          hint={t.auth.fields.passwordHint}
        />
        <Button type="submit" pending={pending} pendingText={t.auth.signup.pending}>
          {t.auth.signup.submit}
        </Button>
      </form>

      <p className="text-center text-base text-neutral-600">
        {t.auth.signup.haveAccount}{" "}
        <Link href={withNext("/login", next)} className="font-medium text-accent underline underline-offset-4">
          {t.auth.signup.toLogin}
        </Link>
      </p>
    </>
  );
}
