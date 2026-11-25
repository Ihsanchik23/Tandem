"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resendEmail, type AuthFormState } from "@/lib/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
import { t } from "@/lib/i18n";
import { FormMessage } from "@/components/ui/FormMessage";
import { AuthButton } from "./AuthField";
import { AuthHeader } from "./AuthHeader";

export function CheckEmail() {
  const params = useSearchParams();
  const kind = params.get("kind") === "recovery" ? "recovery" : "signup";
  const email = params.get("email") ?? "";
  const next = safeNext(params.get("next"));
  const [state, action, pending] = useActionState<AuthFormState, FormData>(resendEmail, {});

  const c = t.auth.checkEmail;
  const text = kind === "recovery" ? (email ? c.recoveryText : c.recoveryTextNoEmail) : email ? c.signupText : c.signupTextNoEmail;

  return (
    <>
      <AuthHeader title={c.title} />
      <div className="flex flex-col gap-3 text-base text-ink">
        <p>
          {text}
          {email ? (
            <>
              {" "}
              <span className="break-all font-medium text-ink">{email}</span>
            </>
          ) : null}
        </p>
        <p className="text-ink">{c.hint}</p>
      </div>

      {state.error ? (
        <FormMessage kind="error" compact>
          {t.errors[state.error]}
        </FormMessage>
      ) : null}
      {state.notice === "resent" ? (
        <FormMessage kind="notice" compact>
          {c.resent}
        </FormMessage>
      ) : null}

      {email ? (
        <form action={action}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="kind" value={kind} />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <AuthButton type="submit" variant="secondary" pending={pending} pendingText={c.resendPending}>
            {c.resend}
          </AuthButton>
        </form>
      ) : null}

      <p className="auth-prompt auth-bottom">
        <Link href="/login">{c.backToLogin}</Link>
      </p>
    </>
  );
}
