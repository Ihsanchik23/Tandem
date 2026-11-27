"use client";

import { useLayoutEffect, useRef } from "react";

// Многострочное поле, которое растёт по мере ввода (до maxHeight), — описание в формах.
export function AutoGrowArea({
  value,
  onChange,
  maxHeight = 240,
  className = "",
  ...rest
}: { value: string; onChange: (v: string) => void; maxHeight?: number; className?: string } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value" | "className"
>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value, maxHeight]);
  return <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value)} className={`resize-none ${className}`} {...rest} />;
}
