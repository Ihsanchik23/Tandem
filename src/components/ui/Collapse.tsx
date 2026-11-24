// Плавное раскрытие и сворачивание блока по высоте (без библиотек): строка сетки 0fr ↔ 1fr.
// Закрытый блок остаётся в разметке, но недоступен для клавиатуры и скринридеров (inert).
export function Collapse({ open, children, className = "" }: { open: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      } ${className}`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
