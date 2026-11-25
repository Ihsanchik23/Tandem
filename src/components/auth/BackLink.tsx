"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { GUEST_PATHS, safeNext } from "@/lib/auth/redirect";
import { t } from "@/lib/i18n";
import { ArrowLeftIcon } from "@/components/nav/icons";

// Стрелка «назад» на экранах входа (телефон).
// Вход и регистрация — в гостевой раздел, откуда пришли (?next=), иначе на «Главную».
// «Забыли пароль» и «Проверьте почту» — ко входу. На «Новом пароле» стрелки нет.
export function BackLink() {
  const pathname = usePathname();
  const params = useSearchParams();
  // «Новый пароль» открывается по ссылке из письма — возвращаться некуда.
  if (pathname === "/reset-password") return <div className="h-11" />;
  const href = pathname === "/login" || pathname === "/signup" ? sectionOf(safeNext(params.get("next"))) : "/login";

  return (
    <Link
      href={href}
      aria-label={t.auth.back}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-neutral-100"
    >
      <ArrowLeftIcon className="h-6 w-6" />
    </Link>
  );
}

// Гостевой раздел для адреса возврата: /work/p/1 → /work. Остальное — «Главная».
function sectionOf(next: string | null): string {
  const path = next?.split(/[?#]/)[0];
  if (!path) return "/";
  return GUEST_PATHS.find((p) => p !== "/" && (path === p || path.startsWith(`${p}/`))) ?? "/";
}
