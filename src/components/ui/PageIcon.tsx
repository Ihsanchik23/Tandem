import { SidebarGlyph } from "@/components/nav/SidebarGlyph";

// Иконка рабочей страницы — одна и та же везде: боковое меню, список «Работа», архив,
// «Сообщения», шапка страницы. Цветной круг с белой пиктограммой модуля.
const PAGE_COLOR = "var(--branch-1-line)";

export function PageIcon({ moduleKey, size = 40 }: { moduleKey: string; size?: number }) {
  const glyph = Math.round(size * 0.7);
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: PAGE_COLOR }}
    >
      <span style={{ width: glyph, height: glyph }}>
        <SidebarGlyph kind={moduleKey === "chat" ? "chat" : "tasks"} cutout={PAGE_COLOR} className="block h-full w-full" />
      </span>
    </span>
  );
}
