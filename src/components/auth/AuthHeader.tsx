type Props = { title: string; subtitle?: string };

// Заголовок формы входа: слева, крупный и жирный (как в eZone), под ним — пояснение.
export function AuthHeader({ title, subtitle }: Props) {
  return (
    <div>
      <h1 className="auth-heading">{title}</h1>
      {subtitle ? <p className="auth-description">{subtitle}</p> : null}
    </div>
  );
}
