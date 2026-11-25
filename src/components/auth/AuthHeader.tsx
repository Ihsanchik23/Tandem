type Props = { title: string; subtitle?: string };

export function AuthHeader({ title, subtitle }: Props) {
  return (
    <div className="flex flex-col gap-1.5 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
      {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}
