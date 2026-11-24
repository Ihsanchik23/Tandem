"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { ChatPageIcon, TasksPageIcon } from "@/components/nav/icons";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextAreaField, TextField } from "@/components/ui/TextField";
import { createPage, updatePage } from "./actions";
import { PAGE_LIMITS, PAGE_MODULES, validatePage, type ModuleKey, type PageFieldErrors, type ScopeSelection } from "./logic";
import { ScopePicker } from "./ScopePicker";
import type { ScopeOptions } from "./scopeOptions";

type CreateProps = {
  mode: "create";
  organizationId: string;
  options: ScopeOptions;
  initialSelection: ScopeSelection;
  returnToCanvas?: boolean;
};
type EditProps = { mode: "edit"; pageId: string; initial: { name: string; description: string } };

// Создание страницы (модуль, название, описание, доступ) и изменение названия и описания.
export function PageForm(props: CreateProps | EditProps) {
  const p = t.pages;
  const isCreate = props.mode === "create";
  const [module, setModule] = useState<ModuleKey>("tasks");
  const [name, setName] = useState(isCreate ? p.modules.tasks : props.initial.name);
  const [nameTouched, setNameTouched] = useState(!isCreate);
  const [description, setDescription] = useState(isCreate ? "" : props.initial.description);
  const [selection, setSelection] = useState<ScopeSelection>(isCreate ? props.initialSelection : { organization: true, units: [], users: [] });
  const [errors, setErrors] = useState<PageFieldErrors>({});
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function pickModule(m: ModuleKey) {
    setModule(m);
    // Название подставляется по модулю, пока его не меняли руками.
    if (!nameTouched) setName(p.modules[m]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const found = validatePage({ name, description, selection: isCreate ? selection : undefined });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    start(async () => {
      const res = isCreate
        ? await createPage({ organizationId: props.organizationId, module, name, description, selection, returnToCanvas: props.returnToCanvas })
        : await updatePage(props.pageId, name, description);
      setErrors(res.fieldErrors ?? {});
      setFormError(res.error && !res.fieldErrors ? res.error : null);
      if (!res.error) setSaved(true);
    });
  }

  const err = (k: keyof PageFieldErrors) => (errors[k] ? t.errors[errors[k]!] : null);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {isCreate ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-ink">{p.moduleLabel}</legend>
          <div className="grid grid-cols-2 gap-3">
            {PAGE_MODULES.map((m) => (
              <label
                key={m}
                className="flex h-14 cursor-pointer items-center gap-3 rounded-xl border border-neutral-300 px-4 text-base font-medium text-ink transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/5"
              >
                <input type="radio" name="module" value={m} checked={module === m} onChange={() => pickModule(m)} className="sr-only" />
                {m === "chat" ? <ChatPageIcon className="h-6 w-6" /> : <TasksPageIcon className="h-6 w-6" />}
                {p.modules[m]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <TextField
        label={p.name}
        name="name"
        value={name}
        maxLength={PAGE_LIMITS.name}
        onChange={(e) => {
          setName(e.target.value);
          setNameTouched(true);
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

      {isCreate ? (
        <ScopePicker
          options={props.options}
          value={selection}
          onChange={(v) => {
            setSelection(v);
            setErrors((x) => ({ ...x, scope: undefined }));
          }}
          error={err("scope")}
        />
      ) : null}

      {formError ? <FormMessage kind="error">{t.errors[formError]}</FormMessage> : null}
      {saved && !isCreate ? <FormMessage kind="notice">{p.saved}</FormMessage> : null}

      <div className="flex flex-col gap-3">
        <Button type="submit" pending={pending} pendingText={isCreate ? p.creating : p.saving}>
          {isCreate ? p.create : p.save}
        </Button>
        {isCreate ? (
          <Link
            href="/work"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-base font-medium text-ink hover:bg-neutral-50"
          >
            {p.cancel}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
