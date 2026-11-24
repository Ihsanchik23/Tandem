"use client";

import { useActionState } from "react";
import { setMemberPosition, setMemberRole, type ActionState } from "@/lib/company/actions";
import type { Role } from "@/lib/company/permissions";
import { LIMITS } from "@/lib/company/validation";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";

type Ids = { organizationId: string; userId: string };

function Hidden({ organizationId, userId }: Ids) {
  return (
    <>
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="user_id" value={userId} />
    </>
  );
}

function Result({ state }: { state: ActionState }) {
  if (state.error) return <FormMessage kind="error">{t.errors[state.error]}</FormMessage>;
  if (state.done) return <FormMessage kind="notice">{t.company.saved}</FormMessage>;
  return null;
}

// Должность сотрудника (Owner/Admin). Пустое поле — без должности.
export function PositionForm({ position, ...ids }: Ids & { position: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setMemberPosition, {});
  const c = t.company;
  return (
    <form action={action} className="flex flex-col gap-3">
      <Hidden {...ids} />
      <TextField
        label={c.position}
        name="position"
        defaultValue={position ?? ""}
        placeholder={c.positionPlaceholder}
        maxLength={LIMITS.position}
        hint={c.positionHint}
      />
      <Result state={state} />
      <Button type="submit" variant="secondary" pending={pending} pendingText={c.saving}>
        {c.save}
      </Button>
    </form>
  );
}

// Роль сотрудника. Варианты уже отфильтрованы по правам того, кто меняет.
export function RoleForm({ role, options, ...ids }: Ids & { role: Role; options: Role[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setMemberRole, {});
  const c = t.company;
  return (
    <form action={action} className="flex flex-col gap-3">
      <Hidden {...ids} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-neutral-700">{c.role}</legend>
        {options.map((r) => (
          <label
            key={r}
            className="flex h-12 items-center gap-3 rounded-xl border border-neutral-300 px-4 text-base text-ink has-[:checked]:border-accent"
          >
            <input type="radio" name="role" value={r} defaultChecked={r === role} className="h-4 w-4 accent-accent" />
            {c.roles[r]}
          </label>
        ))}
      </fieldset>
      <Result state={state} />
      <Button type="submit" variant="secondary" pending={pending} pendingText={c.saving}>
        {c.save}
      </Button>
    </form>
  );
}
