"use client";

import { useState, useTransition } from "react";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { AutoGrowArea } from "@/components/ui/AutoGrowArea";
import { PrimaryButton } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { FieldRow, fieldInput, Section } from "@/components/ui/Grouped";
import { FormMessage } from "@/components/ui/FormMessage";
import { updatePage } from "./actions";
import { PAGE_LIMITS, validatePage, type PageFieldErrors } from "./logic";

/** С какого остатка символов показывать счётчик. */
export const COUNTER_FROM = { name: 10, description: 100 } as const;

export function counterText(text: string, max: number, from: number): string | null {
  return max - text.length <= from ? format(t.pages.counter, { n: text.length, max }) : null;
}

/** Поля «Название» и «Описание» — одинаковые в создании страницы и в настройках. */
export function PageFields({
  name,
  description,
  onName,
  onDescription,
  errors,
  namePlaceholder,
  idPrefix,
}: {
  name: string;
  description: string;
  onName: (v: string) => void;
  onDescription: (v: string) => void;
  errors: PageFieldErrors;
  namePlaceholder?: string;
  idPrefix: string;
}) {
  const p = t.pages;
  const err = (k: keyof PageFieldErrors) => (errors[k] ? t.errors[errors[k]!] : null);
  return (
    <Section title={p.general}>
      <FieldRow label={p.name} htmlFor={`${idPrefix}-name`} aside={counterText(name, PAGE_LIMITS.name, COUNTER_FROM.name)} error={err("name")}>
        <input
          id={`${idPrefix}-name`}
          value={name}
          maxLength={PAGE_LIMITS.name}
          required
          autoComplete="off"
          placeholder={namePlaceholder}
          onChange={(e) => onName(e.target.value)}
          aria-invalid={!!errors.name}
          className={fieldInput}
        />
      </FieldRow>
      <FieldRow
        label={p.description}
        htmlFor={`${idPrefix}-description`}
        aside={counterText(description, PAGE_LIMITS.description, COUNTER_FROM.description)}
        error={err("description")}
      >
        <AutoGrowArea
          id={`${idPrefix}-description`}
          value={description}
          maxLength={PAGE_LIMITS.description}
          placeholder={p.descriptionPlaceholder}
          onChange={onDescription}
          className={fieldInput}
        />
      </FieldRow>
    </Section>
  );
}

// «Основное» в настройках страницы. «Сохранить» появляется, только когда есть изменения.
export function PageForm({ pageId, initial }: { pageId: string; initial: { name: string; description: string } }) {
  const p = t.pages;
  const [base, setBase] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [errors, setErrors] = useState<PageFieldErrors>({});
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const changed = name !== base.name || description !== base.description;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validatePage({ name, description });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    start(async () => {
      const res = await updatePage(pageId, name, description);
      setErrors(res.fieldErrors ?? {});
      setFormError(res.error && !res.fieldErrors ? res.error : null);
      if (!res.error) {
        setBase({ name, description });
        setSaved(true);
      }
    });
  }

  const edit = () => {
    setSaved(false);
    setErrors({});
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <PageFields
        idPrefix="page-settings"
        name={name}
        description={description}
        onName={(v) => {
          setName(v);
          edit();
        }}
        onDescription={(v) => {
          setDescription(v);
          edit();
        }}
        errors={errors}
      />

      {formError ? <FormMessage kind="error">{t.errors[formError]}</FormMessage> : null}

      <Collapse open={changed || saved}>
        <div className="flex items-center justify-end gap-3 pt-1">
          {saved && !changed ? <span className="text-[14px] text-muted">{p.saved}</span> : null}
          {changed ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setName(base.name);
                  setDescription(base.description);
                  edit();
                }}
                className="h-10 rounded-full px-4 text-[14px] font-medium text-ink transition-colors hover:bg-black/5"
              >
                {p.cancel}
              </button>
              <PrimaryButton type="submit" size="sm" pending={pending} pendingText={p.saving}>
                {p.save}
              </PrimaryButton>
            </>
          ) : null}
        </div>
      </Collapse>
    </form>
  );
}
