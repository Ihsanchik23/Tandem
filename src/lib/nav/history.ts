"use client";

// Были ли переходы внутри приложения в этой вкладке. Нужно кнопке «Назад» на полноэкранных
// экранах телефона: есть куда вернуться — router.back(), открыли по ссылке — на запасной адрес.
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

let navigated = false;

export function canGoBack(): boolean {
  return navigated;
}

/** Ставится один раз в общей рамке приложения (AppNav). */
export function useTrackNavigation() {
  const pathname = usePathname();
  const first = useRef<string | null>(null);
  useEffect(() => {
    if (first.current === null) first.current = pathname;
    else if (pathname !== first.current) navigated = true;
  }, [pathname]);
}
