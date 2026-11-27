"use client";

import { useState, useTransition } from "react";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextAreaField, TextField } from "@/components/ui/TextField";
import { updatePage } from "./actions";
import { PAGE_LIMITS, validatePage, type PageFieldErrors } from "./logic";

// Название и описание страницы в её настройках. Создание — панель «Новая страница» (NewPagePanel).
export function PageForm({ pageId, initial }: { pageId: string; initial: { name: string; description: string } }) {
  const p = t.pages;
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [errors, setErrors] = useState<PageFieldErrors>({});
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const found = validatePage({ name, description });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    start(async () => {
      const res = await updatePage(pageId, name, description);
      setErrors(res.fieldErrors ?? {});
      setFormError(res.error && !res.fieldErrors ? res.error : null);
      if (!res.error) setSaved(true);
    });
  }

  const err = (k: keyof PageFieldErrors) => (errors[k] ? t.errors[errors[k]!] : null);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <TextField
        label={p.name}
        name="name"
        value={name}
        maxLength={PAGE_LIMITS.name}
        onChange={(e) => {
          setName(e.target.value);
          setErrors((x) => ({ ...x, name: undefined }));
        }}
        error={err("name")}
      />
      <TextAreaField
        label={p.description}
        name="description"
        value={description}
        rows={3}
        maxLength={PAGE_LIMITS.description}
        placeholder={p.descriptionPlaceholder}
        onChange={(e) => {
          setDescription(e.target.value);
          setErrors((x) => ({ ...x, description: undefined }));
        }}
        error={err("description")}
        aside={format(p.counter, { n: description.length, max: PAGE_LIMITS.description })}
      />
      {formError ? <FormMessage kind="error">{t.errors[formError]}</FormMessage> : null}
      {saved ? <FormMessage kind="notice">{p.saved}</FormMessage> : null}
      <Button type="submit" pending={pending} pendingText={p.saving}>
        {p.save}
      </Button>
    </form>
  );
}
