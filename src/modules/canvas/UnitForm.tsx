"use client";

import { useState, useTransition } from "react";
import { t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { UNIT_LIMITS, validateUnit } from "./errors";
import type { UnitResult } from "./actions";

type Props = {
  initial?: { name: string; address: string };
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (name: string, address: string) => Promise<UnitResult>;
  onDone?: () => void;
};

// Название и адрес подразделения — для создания и для изменения.
export function UnitForm({ initial, submitLabel, pendingLabel, onSubmit, onDone }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const c = t.canvas;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const invalid = validateUnit(name, address);
    if (invalid) return setError(invalid);
    start(async () => {
      const res = await onSubmit(name, address);
      setError(res.error ?? null);
      if (!res.error) {
        setSaved(true);
        onDone?.();
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <TextField
        label={c.name}
        name="name"
        value={name}
        maxLength={UNIT_LIMITS.name}
        placeholder={c.namePlaceholder}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
      />
      <TextField
        label={c.address}
        name="address"
        value={address}
        maxLength={UNIT_LIMITS.address}
        placeholder={c.addressPlaceholder}
        autoComplete="street-address"
        onChange={(e) => {
          setAddress(e.target.value);
          setError(null);
        }}
      />
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
      {saved && !onDone ? <FormMessage kind="notice">{c.saved}</FormMessage> : null}
      <Button type="submit" pending={pending} pendingText={pendingLabel}>
        {submitLabel}
      </Button>
    </form>
  );
}
