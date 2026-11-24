// Своя раскладка дерева по уровням (без библиотек): у каждого подразделения один родитель.
// Карточки могут быть разной ширины (подразделения и страницы): width — число или функция.
// Ширина ветки = сумма ширин дочерних веток. Дерево растёт вправо от левого края:
// родитель стоит над своим первым ребёнком, компания — в точке (0, 0).
// Так новое подразделение сдвигает только ветки правее себя, и только если ему не хватает места;
// карточки левее и выше не двигаются (при центрировании сдвигалось всё дерево).
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
  // left — левый край ветки; узел стоит у левого края, дети — подряд слева направо.
  function place(id: string, left: number, seen: Set<string>) {
    if (seen.has(id)) return;
    seen.add(id);
    points.set(id, { x: left, y: levelY[depthOf.get(id) ?? 0] ?? 0 });
    const kids = children(id);
    let x = left;
    for (const k of kids) {
      place(k, x, seen);
      x += (spans.get(k) ?? width(k)) + gapX;
    }
  }
  place(ROOT_ID, 0, new Set());
  return points;
}

// ---------- Новая карточка в расставленной вручную схеме ----------
export type Rect = { x: number; y: number; w: number; h: number };

function overlaps(a: Rect, b: Rect, pad: number): boolean {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

// Когда человек расставил карточки по-своему, они больше не двигаются сами. Новая карточка встаёт
// рядом с тем местом, где родитель стоит СЕЙЧАС: правее последнего «брата» (на его высоте),
// а если детей ещё нет — под родителем. Место занято — сдвигаем новую вправо до первого свободного.
export function placeNear(
  parent: Rect,
  siblings: Rect[],
  size: { w: number; h: number },
  obstacles: Rect[],
  gapX: number,
  gapY: number,
): Point {
  let x: number;
  let y: number;
  if (siblings.length > 0) {
    const last = siblings.reduce((a, b) => (b.x + b.w > a.x + a.w ? b : a));
    x = last.x + last.w + gapX;
    y = last.y;
  } else {
    x = parent.x;
    y = parent.y + parent.h + gapY;
  }
  for (let i = 0; i < 500; i++) {
    const hit = obstacles.find((o) => overlaps({ x, y, w: size.w, h: size.h }, o, gapX / 2));
    if (!hit) break;
    x = hit.x + hit.w + gapX;
  }
  return { x, y };
}
