// compact — меньший блок (скругление 8px, отступ 12px): так сообщения выглядят в формах входа.
type Props = { kind: "error" | "notice"; children: React.ReactNode; compact?: boolean };

export function FormMessage({ kind, children, compact = false }: Props) {
  const styles =
    kind === "error"
      ? "bg-red-50 text-red-800"
      : "bg-emerald-50 text-emerald-800";
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`animate-fade-in text-sm ${compact ? "rounded-xl p-3" : "rounded-2xl px-4 py-3"} ${styles}`}
    >
      {children}
    </p>
  );
}
