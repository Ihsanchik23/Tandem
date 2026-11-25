// compact — меньший блок (скругление 8px, отступ 12px): так сообщения выглядят в формах входа.
type Props = { kind: "error" | "notice"; children: React.ReactNode; compact?: boolean };

export function FormMessage({ kind, children, compact = false }: Props) {
  const styles =
    kind === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`animate-fade-in border text-sm ${compact ? "rounded-lg p-3" : "rounded-xl px-4 py-3"} ${styles}`}
    >
      {children}
    </p>
  );
}
