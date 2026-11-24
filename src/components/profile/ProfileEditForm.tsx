"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { updateProfile, type ProfileFormState } from "@/lib/profile/actions";
import {
  LIMITS,
  normalizeUsername,
  validateProfile,
  type ProfileFieldErrors,
  type ProfileInput,
} from "@/lib/profile/validation";
import { format, t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextAreaField, TextField } from "@/components/ui/TextField";

type Props = { initial: ProfileInput; cancelHref: string };

export function ProfileEditForm({ initial, cancelHref }: Props) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfile, {});
  const [values, setValues] = useState<ProfileInput>(state.values ?? initial);
  const [clientErrors, setClientErrors] = useState<ProfileFieldErrors>({});
  // Ошибки с сервера (например, «имя уже занято») показываем, пока поле не изменили.
  const [dismissed, setDismissed] = useState<Set<keyof ProfileInput>>(new Set());
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    setDismissed(new Set());
  }

  const serverErrors: ProfileFieldErrors = Object.fromEntries(
    Object.entries(state.fieldErrors ?? {}).filter(([k]) => !dismissed.has(k as keyof ProfileInput)),
  );
  const errors: ProfileFieldErrors = { ...serverErrors, ...clientErrors };
  const e = t.profileEdit;

  function set<K extends keyof ProfileInput>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setClientErrors((c) => ({ ...c, [key]: undefined }));
    setDismissed((d) => new Set(d).add(key));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const found = validateProfile({
      ...values,
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      username: normalizeUsername(values.username),
      city: values.city.trim(),
      bio: values.bio.trim(),
    });
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      setClientErrors(found);
    }
  }

  const err = (key: keyof ProfileInput) => (errors[key] ? t.errors[errors[key]!] : null);
  const hasFieldErrors = Object.values(errors).some(Boolean);

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {state.error && !hasFieldErrors ? <FormMessage kind="error">{t.errors[state.error]}</FormMessage> : null}

      <TextField
        label={e.firstName}
        name="first_name"
        autoComplete="given-name"
        maxLength={LIMITS.name}
        value={values.first_name}
        onChange={(ev) => set("first_name", ev.target.value)}
        error={err("first_name")}
      />
      <TextField
        label={e.lastName}
        name="last_name"
        autoComplete="family-name"
        maxLength={LIMITS.name}
        value={values.last_name}
        onChange={(ev) => set("last_name", ev.target.value)}
        error={err("last_name")}
      />
      <TextField
        label={e.username}
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={LIMITS.usernameMax + 1}
        value={values.username}
        onChange={(ev) => set("username", normalizeUsername(ev.target.value))}
        error={err("username")}
        hint={
          <>
            {e.usernameHint} <span className="break-all font-medium text-neutral-700">/@{values.username || "…"}</span>
          </>
        }
      />
      <TextField
        label={e.city}
        name="city"
        autoComplete="address-level2"
        maxLength={LIMITS.city}
        value={values.city}
        onChange={(ev) => set("city", ev.target.value)}
        error={err("city")}
      />
      <TextAreaField
        label={e.bio}
        name="bio"
        placeholder={e.bioPlaceholder}
        maxLength={LIMITS.bio}
        rows={4}
        value={values.bio}
        onChange={(ev) => set("bio", ev.target.value)}
        error={err("bio")}
        aside={format(e.counter, { n: values.bio.length, max: LIMITS.bio })}
      />

      <div className="flex flex-col gap-3 pt-2">
        <Button type="submit" pending={pending} pendingText={e.saving}>
          {e.save}
        </Button>
        <Link
          href={cancelHref}
          className="inline-flex h-12 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-base font-medium text-ink hover:bg-neutral-50"
        >
          {e.cancel}
        </Link>
      </div>
    </form>
  );
}
