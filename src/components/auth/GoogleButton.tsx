"use client";

import Image from "next/image";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { FormMessage } from "@/components/ui/FormMessage";

// Разделитель «или» и кнопка «Войти через Google».
// Пока только внешний вид: вход через Google ещё не подключён, кнопка показывает «скоро».
export function GoogleButton() {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-[18px]">
      <div className="auth-divider">{t.auth.or}</div>
      <button type="button" onClick={() => setShown(true)} className="auth-google">
        {/* Логотип Google — его фирменные цвета, токенами Tandem не заменяются. */}
        <Image src="/google-g.png" alt="" width={22} height={23} className="h-auto w-[22px] shrink-0" />
        {t.auth.google}
      </button>
      {shown ? (
        <FormMessage kind="notice" compact>
          {t.auth.googleSoon}
        </FormMessage>
      ) : null}
    </div>
  );
}
