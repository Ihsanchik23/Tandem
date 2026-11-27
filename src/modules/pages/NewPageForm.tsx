"use client";

import { useMemo, useState, useTransition } from "react";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { FormMessage } from "@/components/ui/FormMessage";
import { RadioRow, Section } from "@/components/ui/Grouped";
import { PageIcon } from "@/components/ui/PageIcon";
import { buildTree } from "@/modules/canvas/tree";
import { moduleAvailable, moduleDef, MODULES } from "@/modules/registry";
import { createPage, type NewPageData } from "./actions";
import { AccessPicker } from "./AccessPicker";
import { validatePage, type ModuleKey, type PageFieldErrors, type ScopeSelection } from "./logic";
import { PageFields } from "./PageForm";

export const NEW_PAGE_FORM_ID = "new-page-form";

// Форма «Новая страница» — та же структура, что у настроек страницы: «Тип», «Основное», «Доступ».
// Кнопки «Создать» и «Отмена» — в закреплённом низу панели (NewPagePanel), кнопка связана с формой по id.
export function NewPageForm({
  data,
  initialUnit,
  initialScope,
  onPending,
  onCreated,
}: {
  data: NewPageData;
  initialUnit: string | null;
  initialScope: string | null;
  onPending: (pending: boolean) => void;
  onCreated: (pageId: string) => void;
}) {
  const p = t.pages;
  const { options, used } = data;
  const tree = useMemo(() => buildTree(options.units, options.unitMembers), [options.units, options.unitMembers]);

  const firstModule = MODULES.find((m) => moduleAvailable(m, used[m.key] ?? 0))?.key ?? MODULES[0]!.key;
  const [module, setModule] = useState<ModuleKey>(firstModule);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selection, setSelection] = useState<ScopeSelection>(() => initialSelection(data, initialUnit, initialScope));
  const [errors, setErrors] = useState<PageFieldErrors>({});
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validatePage({ name, description, selection });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    onPending(true);
    start(async () => {
      const res = await createPage({ organizationId: data.organizationId, module, name, description, selection });
      if (res.pageId) {
        onCreated(res.pageId);
        return;
      }
      onPending(false);
      setErrors(res.fieldErrors ?? {});
      setFormError(res.error && !res.fieldErrors ? res.error : null);
    });
  }

  return (
    <form id={NEW_PAGE_FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-6 pb-2">
      <Section title={p.moduleLabel}>
        {MODULES.map((m) => {
          const count = used[m.key] ?? 0;
          const available = moduleAvailable(m, count);
          const side =
            m.status === "soon" ? p.moduleSoon : m.limit !== null ? (available ? format(p.moduleCount, { n: count, max: m.limit }) : p.moduleLimit) : null;
          return (
            <RadioRow
              key={m.key}
              name="module"
              value={m.key}
              checked={module === m.key}
              disabled={!available}
              onChange={() => setModule(m.key)}
              icon={<PageIcon moduleKey={m.key} size={24} />}
              label={m.name}
              sub={m.description}
              side={side}
            />
          );
        })}
      </Section>

      <PageFields
        idPrefix="new-page"
        name={name}
        description={description}
        namePlaceholder={moduleDef(module).namePlaceholder}
        onName={(v) => {
          setName(v);
          setErrors((x) => ({ ...x, name: undefined }));
        }}
        onDescription={(v) => {
          setDescription(v);
          setErrors((x) => ({ ...x, description: undefined }));
        }}
        errors={errors}
      />

      <div className="flex flex-col gap-2">
        <AccessPicker
          options={options}
          tree={tree}
          value={selection}
          onChange={(v) => {
            setSelection(v);
            setErrors((x) => ({ ...x, scope: undefined }));
          }}
        />
        {errors.scope ? <p className="animate-fade-in px-3.5 text-[13px] text-red-700">{t.errors[errors.scope]}</p> : null}
      </div>

      {formError ? <FormMessage kind="error">{t.errors[formError]}</FormMessage> : null}
    </form>
  );
}

function initialSelection(data: NewPageData, unit: string | null, scope: string | null): ScopeSelection {
  const { options } = data;
  const allowed = (id: string) => options.units.some((u) => u.id === id) && (!options.allowedUnitIds || options.allowedUnitIds.includes(id));
  if (unit && allowed(unit)) return { organization: false, units: [unit], users: [] };
  if (scope === "organization" && options.allowOrganization) return { organization: true, units: [], users: [] };
  return { organization: options.allowOrganization, units: [], users: [] };
}
