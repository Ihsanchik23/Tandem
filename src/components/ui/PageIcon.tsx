import { SidebarGlyph } from "@/components/nav/SidebarGlyph";
import { moduleDef } from "@/modules/registry";

// Иконка рабочей страницы — одна и та же везде: боковое меню, список «Работа», архив,
// «Сообщения», шапки, форма создания. Цвет и пиктограмма — из реестра модулей (modules/registry.ts).
export function PageIcon({ moduleKey, size = 40 }: { moduleKey: string; size?: number }) {
  const m = moduleDef(moduleKey);
  const glyph = Math.round(size * 0.7);
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: m.color }}
    >
      <span style={{ width: glyph, height: glyph }}>
        <SidebarGlyph kind={m.glyph} cutout={m.color} className="block h-full w-full" />
      </span>
    </span>
  );
}
