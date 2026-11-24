type Props = { title: string; subtitle?: string };

export function AuthHeader({ title, subtitle }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {subtitle ? <p className="text-base text-ink">{subtitle}</p> : null}
    </div>
  );
}
