"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

// Ссылки между публичными профилями остаются внутри правой колонки каталога.
export function PreviewLinks({ children }: { children: ReactNode }) {
  const router = useRouter();

  function followProfile(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a[href]");
    if (!link || !event.currentTarget.contains(link)) return;
    const url = new URL(link.getAttribute("href") ?? "", window.location.href);
    if (url.origin !== window.location.origin) return;

    const person = url.pathname.match(/^\/@([^/]+)$/)?.[1];
    const company = url.pathname.match(/^\/c\/([^/]+)$/)?.[1];
    if (!person && !company) return;
    event.preventDefault();

    const next = new URLSearchParams(window.location.search);
    next.delete("person");
    next.delete("company");
    if (person) next.set("person", decodeURIComponent(person));
    if (company) next.set("company", decodeURIComponent(company));
    router.push(`/search?${next.toString()}`, { scroll: false });
  }

  return <div onClickCapture={followProfile} className="flex min-w-0 flex-1">{children}</div>;
}
