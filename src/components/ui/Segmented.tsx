"use client";

// Выбор из 2–3 вариантов: сегменты-таблетки, выбранный — чёрный с белым текстом (docs/design.md).
// Чёрная плашка плавно переезжает к выбранному. Дорожка — bg-surface; внутри серой группы — белая (onCard).
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  onCard = false,
}: {
  label: string;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  onCard?: boolean;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const n = options.length;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative grid rounded-full p-1 ${onCard ? "bg-white" : "bg-surface"}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full bg-ink transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ width: `calc((100% - 0.5rem) / ${n})`, transform: `translateX(${index * 100}%)` }}
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
            className={`relative flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-[14px] font-medium transition-colors duration-200 ${
              on ? "text-white" : "text-ink"
            } ${disabled && !on ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
