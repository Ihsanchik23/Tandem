"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Collapse } from "@/components/ui/Collapse";
import { FormMessage } from "@/components/ui/FormMessage";
import { Group } from "@/components/ui/Grouped";
import { updatePage } from "./actions";
import { PAGE_LIMITS, validatePage, type PageFieldErrors } from "./logic";

/** С какого остатка символов описания показывать счётчик. */
const COUNTER_FROM = 100;

// «Основное» в настройках страницы: название и описание в одной белой карточке, как поля в настройках iOS.
// «Сохранить» появляется, только когда есть изменения.
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

  const area = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [description]);

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

  const err = (k: keyof PageFieldErrors) => (errors[k] ? t.errors[errors[k]!] : null);
  const left = PAGE_LIMITS.description - description.length;
  const input = "block w-full bg-transparent text-base text-ink placeholder:text-muted focus:outline-none md:text-[15px]";
  const edit = () => {
    setSaved(false);
    setErrors({});
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <Group title={p.general}>
        <label className="flex flex-col gap-0.5 px-3.5 pt-2.5">
          <span className="text-[12px] text-muted">{p.name}</span>
          <span className="block border-b-[0.5px] border-neutral-200 pb-2.5">
            <input
              value={name}
              maxLength={PAGE_LIMITS.name}
              onChange={(e) => {
                setName(e.target.value);
                edit();
              }}
              aria-invalid={!!errors.name}
              className={input}
            />
          </span>
        </label>
        <label className="flex flex-col gap-0.5 px-3.5 py-2.5">
          <span className="flex items-baseline justify-between gap-3 text-[12px] text-muted">
            {p.description}
            {left <= COUNTER_FROM ? <span className="tabular-nums">{format(p.counter, { n: description.length, max: PAGE_LIMITS.description })}</span> : null}
          </span>
          <textarea
            ref={area}
            rows={1}
            value={description}
            maxLength={PAGE_LIMITS.description}
            placeholder={p.descriptionPlaceholder}
            onChange={(e) => {
              setDescription(e.target.value);
              edit();
            }}
            className={`resize-none ${input}`}
          />
        </label>
      </Group>

      {err("name") ? <p className="px-3.5 text-[13px] text-red-700">{err("name")}</p> : null}
      {err("description") ? <p className="px-3.5 text-[13px] text-red-700">{err("description")}</p> : null}
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
                className="h-9 rounded-full px-4 text-[14px] font-medium text-ink transition-colors hover:bg-black/5"
              >
                {p.cancel}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="h-9 rounded-full bg-accent px-5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {pending ? p.saving : p.save}
              </button>
            </>
          ) : null}
        </div>
      </Collapse>
    </form>
  );
}
