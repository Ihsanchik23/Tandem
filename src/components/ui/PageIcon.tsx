import { moduleDef } from "@/modules/registry";

// Иконка рабочей страницы — одна и та же везде: боковое меню, список «Работа», архив,
// «Сообщения», шапки, форма создания. Иконка модуля из реестра (modules/registry.ts),
// одноцветная, без цветной подложки. tile — нейтральная плашка заданного размера (списки, шапки);
// на белом она серая, на серой карточке (onCard) — белая.
export function PageIcon({ moduleKey, size = 22, tile, onCard = false }: { moduleKey: string; size?: number; tile?: number; onCard?: boolean }) {
  const { Icon } = moduleDef(moduleKey);
  if (!tile) return <Icon size={size} weight="regular" className="shrink-0 text-ink" aria-hidden />;
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-[14px] text-ink ${onCard ? "bg-white" : "bg-surface"}`} style={{ width: tile, height: tile }}>
      <Icon size={Math.round(tile * 0.5)} weight="regular" />
    </span>
  );
}
