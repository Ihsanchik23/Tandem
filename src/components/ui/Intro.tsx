"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Эффекты появления страниц и фото — только при первом открытии сайта за сессию (вкладку).
// Скрипт в <head> ставит html[data-intro] до первой отрисовки, если в этой вкладке сайт ещё
// не открывали; CSS-анимации появления работают только под этой меткой (globals.css).
// При первом переходе внутри сайта метка снимается — дальше страницы появляются сразу.
const KEY = "tandem.intro";
export const INTRO_SCRIPT = `try{if(!sessionStorage.getItem("${KEY}")){sessionStorage.setItem("${KEY}","1");document.documentElement.dataset.intro="1"}}catch(e){}`;

export function IntroGate() {
  const pathname = usePathname();
  const first = useRef(pathname);
  useEffect(() => {
    if (pathname !== first.current) delete document.documentElement.dataset.intro;
  }, [pathname]);
  return null;
}
