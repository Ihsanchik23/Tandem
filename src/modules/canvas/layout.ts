// Своя раскладка дерева по уровням (без библиотек): у каждого подразделения один родитель.
// Карточки могут быть разной ширины (подразделения и страницы): width — число или функция.
// Ширина ветки = сумма ширин дочерних веток; родитель стоит по центру над детьми.
// Высота уровня = самая высокая карточка на этом уровне (раскрытый список людей делает карточку выше).
export const ROOT_ID = "root";

export type LayoutInput = {
  children: (id: string) => string[]; // дети узла; у ROOT_ID — подразделения верхнего уровня
  height: (id: string) => number;
  width: number | ((id: string) => number);
  gapX: number;
  gapY: number;
};

export type Point = { x: number; y: number }; // левый верхний угол карточки

export function layoutTree({ children, height, width: w, gapX, gapY }: LayoutInput): Map<string, Point> {
  const width = (id: string) => (typeof w === "number" ? w : w(id));
  const spans = new Map<string, number>();
  const depthOf = new Map<string, number>();
  const levelHeight: number[] = [];

  // Ширина ветки и глубина каждого узла.
  function measure(id: string, depth: number, seen: Set<string>): number {
    if (seen.has(id)) return width(id); // защита от цикла в данных
    seen.add(id);
    depthOf.set(id, depth);
    levelHeight[depth] = Math.max(levelHeight[depth] ?? 0, height(id));
    const kids = children(id);
    const sum = kids.reduce((acc, k) => acc + measure(k, depth + 1, seen), 0) + gapX * Math.max(0, kids.length - 1);
    const span = Math.max(width(id), sum);
    spans.set(id, span);
    return span;
  }
  measure(ROOT_ID, 0, new Set());

  const levelY: number[] = [];
  levelHeight.forEach((h, d) => (levelY[d] = d === 0 ? 0 : levelY[d - 1]! + levelHeight[d - 1]! + gapY));

  const points = new Map<string, Point>();
  // left — левый край ветки; узел ставим по центру своей ветки.
  function place(id: string, left: number, seen: Set<string>) {
    if (seen.has(id)) return;
    seen.add(id);
    const span = spans.get(id) ?? width(id);
    points.set(id, { x: left + span / 2 - width(id) / 2, y: levelY[depthOf.get(id) ?? 0] ?? 0 });
    const kids = children(id);
    const kidsWidth = kids.reduce((acc, k) => acc + (spans.get(k) ?? width(k)), 0) + gapX * Math.max(0, kids.length - 1);
    let x = left + (span - kidsWidth) / 2;
    for (const k of kids) {
      place(k, x, seen);
      x += (spans.get(k) ?? width(k)) + gapX;
    }
  }
  // Корень — в точке (0, 0) по центру: сдвигаем всё дерево.
  place(ROOT_ID, -(spans.get(ROOT_ID) ?? width(ROOT_ID)) / 2, new Set());
  return points;
}
