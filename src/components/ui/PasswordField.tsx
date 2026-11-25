"use client";

import { useState, type ComponentProps } from "react";
import { t } from "@/lib/i18n";
import { EyeIcon, EyeOffIcon } from "@/components/nav/icons";
import { TextField } from "./TextField";

// Поле пароля с кнопкой-глазком «показать / скрыть».
export function PasswordField(props: Omit<ComponentProps<typeof TextField>, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      // Чтобы показанный пароль не исправлялся и не начинался с заглавной буквы.
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
          aria-pressed={visible}
          aria-controls={props.id ?? `field-${props.name}`}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      }
    />
  );
}
