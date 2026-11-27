"use client";

// Выбор из 2–3 вариантов: сегменты, белая плашка плавно переезжает к выбранному (docs/design.md).
// Дорожка — полупрозрачная: одинаково видна на белом экране и на серой карточке группы.
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const n = options.length;
  return (
    <div role="radiogroup" aria-label={label} className="relative grid rounded-[10px] bg-black/[0.055] p-0.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded-lg bg-white shadow-[0_1px_2px_rgba(30,30,30,0.08),0_3px_8px_-3px_rgba(30,30,30,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ width: `calc((100% - 0.25rem) / ${n})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled && !on}
            onClick={() => !on && onChange(o.value)}
            className={`relative flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-1.5 text-[14px] font-medium transition-colors ${
              on ? "text-ink" : "text-muted enabled:hover:text-ink"
            } ${disabled && !on ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
