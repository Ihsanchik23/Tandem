// Пустой каркас формы, пока загружаются параметры адреса.
export function FormFallback() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="h-8 w-40 rounded-lg bg-neutral-100" />
      <div className="h-12 rounded-xl bg-neutral-100" />
      <div className="h-12 rounded-xl bg-neutral-100" />
      <div className="h-12 rounded-xl bg-neutral-200" />
    </div>
  );
}
