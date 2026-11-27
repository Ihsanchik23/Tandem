"use client";

import { useEffect } from "react";

// Пока открыта панель поверх экрана, страница под ней не прокручивается — только содержимое панели.
// Несколько панелей подряд — блокировка снимается, когда закроется последняя.
// Ширина полосы прокрутки возвращается отступом, чтобы страница не «прыгала» вбок.
let locks = 0;
let saved = { overflow: "", paddingRight: "" };

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    if (locks === 0) {
      const scrollbar = window.innerWidth - html.clientWidth;
      saved = { overflow: html.style.overflow, paddingRight: html.style.paddingRight };
      html.style.overflow = "hidden";
      if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) {
        html.style.overflow = saved.overflow;
        html.style.paddingRight = saved.paddingRight;
      }
    };
  }, [active]);
}
