"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { createCompany, updateCompany, type CompanyFormState } from "@/lib/company/actions";
import {
  LIMITS,
  normalizeSlug,
  slugify,
  validateCompany,
  type CompanyFieldErrors,
  type CompanyInput,
} from "@/lib/company/validation";
import { format, t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextAreaField, TextField } from "@/components/ui/TextField";

type Props =
  | { mode: "create"; cancelHref: string }
  | { mode: "edit"; cancelHref: string; organizationId: string; initial: CompanyInput };

const EMPTY: CompanyInput = { name: "", slug: "", city: "", description: "" };

// Создание компании и редактирование её профиля. Адрес страницы (slug) задаётся только при создании.
export function CompanyForm(props: Props) {
  const isCreate = props.mode === "create";
  const [state, action, pending] = useActionState<CompanyFormState, FormData>(
    isCreate ? createCompany : updateCompany,
    {},
  );
  const [values, setValues] = useState<CompanyInput>(state.values ?? (isCreate ? EMPTY : props.initial));
  // Пока адрес не трогали руками, он повторяет название латиницей.
  const [slugTouched, setSlugTouched] = useState(false);
  const [clientErrors, setClientErrors] = useState<CompanyFieldErrors>({});
  // Ошибки с сервера (например, «адрес занят») показываем, пока поле не изменили.
  const [dismissed, setDismissed] = useState<Set<keyof CompanyInput>>(new Set());
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    setDismissed(new Set());
  }

  const serverErrors: CompanyFieldErrors = Object.fromEntries(
    Object.entries(state.fieldErrors ?? {}).filter(([k]) => !dismissed.has(k as keyof CompanyInput)),
  );
  const errors: CompanyFieldErrors = { ...serverErrors, ...clientErrors };
  const c = t.company;

  function set(key: keyof CompanyInput, value: string) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === "name" && isCreate && !slugTouched) next.slug = slugify(value);
      return next;
    });
    setClientErrors((e) => ({ ...e, [key]: undefined, ...(key === "name" ? { slug: undefined } : {}) }));
    setDismissed((d) => new Set(d).add(key));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const found = validateCompany(
      {
        name: values.name.trim(),
        slug: values.slug.replace(/^-+|-+$/g, ""),
        city: values.city.trim(),
        description: values.description.trim(),
      },
      { withSlug: isCreate },
    );
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      setClientErrors(found);
    }
  }

  const err = (key: keyof CompanyInput) => (errors[key] ? t.errors[errors[key]!] : null);
  const hasFieldErrors = Object.values(errors).some(Boolean);

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {state.error && !hasFieldErrors ? <FormMessage kind="error">{t.errors[state.error]}</FormMessage> : null}
      {!isCreate ? <input type="hidden" name="organization_id" value={props.organizationId} /> : null}

      <TextField
        label={c.name}
        name="name"
        autoComplete="organization"
        maxLength={LIMITS.name}
        value={values.name}
        onChange={(ev) => set("name", ev.target.value)}
        error={err("name")}
      />
      {isCreate ? (
        <TextField
          label={c.slug}
          name="slug"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={LIMITS.slugMax}
          value={values.slug}
          onChange={(ev) => {
            setSlugTouched(true);
            set("slug", normalizeSlug(ev.target.value));
          }}
          error={err("slug")}
          hint={
            <>
              {c.slugHint} <span className="break-all font-medium text-ink">/c/{values.slug || "…"}</span>
            </>
          }
        />
      ) : null}
      <TextField
        label={c.city}
        name="city"
        autoComplete="address-level2"
        placeholder={c.cityPlaceholder}
        maxLength={LIMITS.city}
        value={values.city}
        onChange={(ev) => set("city", ev.target.value)}
        error={err("city")}
      />
      <TextAreaField
        label={c.description}
        name="description"
        placeholder={c.descriptionPlaceholder}
        maxLength={LIMITS.description}
        rows={5}
        value={values.description}
        onChange={(ev) => set("description", ev.target.value)}
        error={err("description")}
        aside={format(c.counter, { n: values.description.length, max: LIMITS.description })}
      />
      {isCreate ? <p className="text-sm text-ink">{c.logoHint}</p> : null}

      <div className="flex flex-col gap-3 pt-2">
        <Button
          type="submit"
          pending={pending}
          pendingText={isCreate ? c.creating : c.saving}
        >
          {isCreate ? c.createSubmit : c.save}
        </Button>
        <Link
          href={props.cancelHref}
          className="inline-flex h-12 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-base font-medium text-ink hover:bg-neutral-50"
        >
          {c.cancel}
        </Link>
      </div>
    </form>
  );
}
