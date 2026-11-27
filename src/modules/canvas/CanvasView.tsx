"use client";

import "@xyflow/react/dist/style.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  type Edge,
  type OnNodesChange,
  type ReactFlowInstance,
  type XYPosition,
} from "@xyflow/react";
import type { Member } from "@/lib/company/queries";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { fullName } from "@/lib/company/people";
import { UnitPicker } from "@/components/company/UnitPicker";
import { Avatar } from "@/components/profile/Avatar";
import { ChevronDownIcon } from "@/components/nav/icons";
import { Button } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { Sheet } from "@/components/ui/Sheet";
import { addUnitMembers, createUnit, moveUnitMember, saveCanvasPositions } from "./actions";
import { CanvasDnd, DraggablePerson, useAssign, type Assign } from "./PeopleDnd";
import { layoutTree, placeNear, ROOT_ID, type Rect } from "./layout";
import {
  CARD_W,
  nodeTypes,
  PAGE_H,
  PAGE_W,
  PERSON_H,
  ROOT_H,
  UNIT_H,
  type PageNodeType,
  type RootNodeType,
  type Tint,
  type UnitNodeType,
} from "./Nodes";
import { branchColors, buildTree, pageHome, treeOrder, unassignedIds, unitPath, type UnitMemberRow, type UnitRow } from "./tree";
import { UnitPanel } from "./UnitPanel";

type Props = {
  organization: { id: string; name: string; logoUrl: string | null };
  units: UnitRow[];
  unitMembers: UnitMemberRow[];
  people: Member[];
  canEdit: boolean;
  pages?: CanvasPage[]; // активные рабочие страницы компании
  savedPositions?: Record<string, [number, number]>; // своя расстановка из базы (canvas_prefs)
};

// Рабочая страница на холсте: стоит под своим подразделением, пунктир — ко всем, кому доступна; люди — счётчиком.
export type CanvasPage = {
  id: string;
  name: string;
  moduleKey: string;
  hasAccess: boolean;
  createdAt: string;
  scopes: { kind: "organization" | "unit" | "user"; unit_id: string | null; user_id: string | null }[];
};

type CanvasNode = RootNodeType | UnitNodeType | PageNodeType;

const GAP_X = 32;
const GAP_Y = 72;
const pageNodeId = (id: string) => `page-${id}`;
const lineColor = (tint: Tint | undefined) => (tint ? `var(--branch-${tint.color}-line)` : "#a3a3a3");

// Телефон или планшет (палец вместо мыши): там рамки выделения нет — один палец двигает карту.
const coarseQuery = "(pointer: coarse)";
function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia(coarseQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useTouchScreen(): boolean {
  return useSyncExternalStore(subscribeCoarse, () => window.matchMedia(coarseQuery).matches, () => false);
}

// Ручная расстановка карточек — личная, хранится в базе (canvas_prefs) и видна на любом устройстве.
type Positions = Map<string, XYPosition>;
const fromRecord = (raw: Record<string, [number, number]> | null | undefined): Positions =>
  new Map(
    Object.entries(raw ?? {})
      .filter(([, p]) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(([id, [x, y]]) => [id, { x, y }]),
  );
const toRecord = (pos: Positions, keep: Set<string>): Record<string, [number, number]> =>
  Object.fromEntries([...pos].filter(([id]) => keep.has(id)).map(([id, p]) => [id, [Math.round(p.x), Math.round(p.y)]]));

// Раньше расстановка жила в памяти браузера — один раз переносим её в базу и очищаем.
const legacyKey = (orgId: string) => `tandem.canvas.positions.${orgId}`;
function readLegacyPositions(orgId: string): Positions {
  try {
    return fromRecord(JSON.parse(localStorage.getItem(legacyKey(orgId)) ?? "{}"));
  } catch {
    return new Map();
  }
}
function dropLegacyPositions(orgId: string) {
  try {
    localStorage.removeItem(legacyKey(orgId));
  } catch {
    // память браузера недоступна — нечего очищать
  }
}
const keyOf = (pos: Positions) => JSON.stringify([...pos].map(([id, p]) => [id, Math.round(p.x), Math.round(p.y)]));
const noopSubscribe = () => () => {};

// Холст рисуется только в браузере: расстановка карточек хранится в его памяти.
export function CanvasView(props: Props) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return <div className="h-full w-full bg-neutral-50" aria-hidden />;
  return <CanvasInner {...props} />;
}

// Canvas (ТЗ, раздел 10): дерево компании с перемещением и масштабом.
// Перенос человека применяем сразу (до ответа сервера); если сервер откажет — вернётся как было.
function applyAssign(rows: UnitMemberRow[], a: { assign: Assign; move: boolean }): UnitMemberRow[] {
  const { userId, fromUnitId, toUnitId } = a.assign;
  let next = a.move && fromUnitId ? rows.filter((r) => !(r.user_id === userId && r.unit_id === fromUnitId)) : rows;
  if (!next.some((r) => r.user_id === userId && r.unit_id === toUnitId)) next = [...next, { unit_id: toUnitId, user_id: userId }];
  return next;
}

function CanvasInner({ organization, units, unitMembers: serverMembers, people, canEdit, pages = [], savedPositions }: Props) {
  // Подтверждённый, но ещё не сохранённый перенос — виден на холсте сразу.
  // Сбрасывается, когда сервер прислал свежий состав (или если он отказал).
  const [pendingAssign, setPendingAssign] = useState<{ assign: Assign; move: boolean } | null>(null);
  const [seenServer, setSeenServer] = useState(serverMembers);
  if (seenServer !== serverMembers) {
    setSeenServer(serverMembers);
    setPendingAssign(null);
  }
  const unitMembers = useMemo(() => (pendingAssign ? applyAssign(serverMembers, pendingAssign) : serverMembers), [serverMembers, pendingAssign]);
  const router = useRouter();
  const params = useSearchParams();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Открытая панель подразделения.
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  // Содержимое панели не пропадает, пока она плавно уезжает.
  const [shownUnitId, setShownUnitId] = useState<string | null>(null);
  if (openUnitId && openUnitId !== shownUnitId) setShownUnitId(openUnitId);
  // У какой карточки открыто меню «+» (одно на холст).
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // Новая карточка: к ней плавно переезжает экран, и она коротко подсвечивается.
  // Страница, созданная из «+», возвращает сюда с ?focus=page-<id>.
  const [startFocus] = useState<string | null>(() => params.get("focus"));
  const [focusId, setFocusId] = useState<string | null>(startFocus);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Ручная расстановка. Пусто — автораскладка. После первого перемещения руками запоминаем места ВСЕХ
  // карточек: дальше они сами не двигаются, а новые встают рядом с настоящим местом родителя.
  // «Вернуть на места» — снова автораскладка.
  // saved — что уже лежит в базе: сохраняем, только когда расстановка правда изменилась.
  const [initial] = useState(() => {
    const fromDb = fromRecord(savedPositions);
    if (fromDb.size > 0) return { pos: fromDb, saved: keyOf(fromDb) };
    const legacy = readLegacyPositions(organization.id);
    return { pos: legacy, saved: keyOf(new Map()) };
  });
  const [moved, setMoved] = useState<Positions>(initial.pos);
  const rfRef = useRef<ReactFlowInstance<CanvasNode, Edge> | null>(null);
  const touch = useTouchScreen();
  const c = t.canvas;
  // Перетаскивать людей — Owner/Admin и только мышью; на телефоне — выбор из списка.
  const dnd = canEdit && !touch;
  const [pickFor, setPickFor] = useState<Member | null>(null);
  const [shownPick, setShownPick] = useState<Member | null>(null);
  if (pickFor && pickFor !== shownPick) setShownPick(pickFor);
  const [toast, setToast] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(units, unitMembers), [units, unitMembers]);
  const colors = useMemo(() => branchColors(tree), [tree]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.user_id, p])), [people]);
  const unassigned = useMemo(() => {
    const ids = new Set(unassignedIds(people.map((p) => p.user_id), unitMembers));
    return people.filter((p) => ids.has(p.user_id));
  }, [people, unitMembers]);

  // Карточки на холсте (собираются ниже из раскладки и расстановки); ссылка — для обработчиков.
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Перед созданием запоминаем текущую схему: новая карточка встанет рядом с родителем,
  // а остальные не сдвинутся (иначе автораскладка переставила бы соседей).
  const pinLayout = useCallback(() => {
    setMoved((m) => (m.size > 0 ? m : new Map(nodesRef.current.map((n) => [n.id, n.position]))));
  }, []);
  const onCreateUnit = useCallback(
    async (parentId: string | null, name: string) => {
      pinLayout();
      const res = await createUnit({ organizationId: organization.id, parentId, name, address: "" });
      if (res.id) setFocusId(res.id);
      return res;
    },
    [organization.id, pinLayout],
  );

  const { layoutNodes, edges, parentOf } = useMemo(() => {
    const order = treeOrder(tree);
    // Страницы — дети своего подразделения (или компании): раскладка сама раздвигает соседей.
    const pagesAt = new Map<string, CanvasPage[]>();
    for (const pg of [...pages].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const home = pageHome(order, pg.scopes) ?? ROOT_ID;
      pagesAt.set(home, [...(pagesAt.get(home) ?? []), pg]);
    }
    const pageTint = (pg: CanvasPage): Tint => {
      const home = pageHome(order, pg.scopes);
      return home ? (colors.get(home) ?? null) : null;
    };
    const kids = (id: string) => [
      ...(id.startsWith("page-") ? [] : (tree.children.get(id === ROOT_ID ? null : id) ?? []).map((u) => u.id)),
      ...(pagesAt.get(id) ?? []).map((pg) => pageNodeId(pg.id)),
    ];
    const height = (id: string) => {
      if (id === ROOT_ID) return ROOT_H;
      if (id.startsWith("page-")) return PAGE_H;
      const n = tree.members.get(id)?.length ?? 0;
      return UNIT_H + (expanded.has(id) ? n * PERSON_H + 8 : 0);
    };
    const width = (id: string) => (id.startsWith("page-") ? PAGE_W : CARD_W);
    const points = layoutTree({ children: kids, height, width, gapX: GAP_X, gapY: GAP_Y });

    const menu = (id: string, pageHref: string) => ({
      canEdit,
      menuOpen: menuFor === id,
      onMenu: (open: boolean) => setMenuFor((cur) => (open ? id : cur === id ? null : cur)),
      onCreateUnit: (name: string) => onCreateUnit(id === ROOT_ID ? null : id, name),
      onPickPage: pinLayout,
      pageHref,
      highlight: highlightId === id,
    });

    const rootNode: RootNodeType = {
      id: ROOT_ID,
      type: "root",
      position: points.get(ROOT_ID) ?? { x: 0, y: 0 },
      zIndex: menuFor === ROOT_ID ? 1000 : 0,
      data: {
        ...menu(ROOT_ID, "/work/structure?new-page=1&scope=organization"),
        name: organization.name,
        logoUrl: organization.logoUrl,
        members: people.length,
      },
    };
    const unitNodes: UnitNodeType[] = units.map((u) => {
      const direct = tree.members.get(u.id) ?? [];
      return {
        id: u.id,
        type: "unit",
        position: points.get(u.id) ?? { x: 0, y: 0 },
        // Открытое меню — поверх всего; раскрытый список людей — поверх карточек ниже.
        zIndex: menuFor === u.id ? 1000 : expanded.has(u.id) ? 10 : 0,
        data: {
          ...menu(u.id, `/work/structure?new-page=1&unit=${u.id}`),
          name: u.name,
          tint: colors.get(u.id) ?? null,
          head: u.head_user_id ? (peopleById.get(u.head_user_id) ?? null) : null,
          direct: direct.length,
          people: direct.flatMap((id) => (peopleById.get(id) ? [peopleById.get(id)!] : [])),
          expanded: expanded.has(u.id),
          onToggle: () =>
            setExpanded((s) => {
              const next = new Set(s);
              if (next.has(u.id)) next.delete(u.id);
              else next.add(u.id);
              return next;
            }),
          onOpen: () => {
            setMenuFor(null);
            setOpenUnitId(u.id);
          },
          id: u.id,
          dnd,
        },
      };
    });
    const edgeList: Edge[] = units.map((u) => ({
      id: `e-${u.id}`,
      source: u.parent_id && tree.byId.has(u.parent_id) ? u.parent_id : ROOT_ID,
      target: u.id,
      type: "default", // плавная кривая, как связи в Figma
      selectable: false,
      style: { stroke: lineColor(colors.get(u.id)), strokeWidth: 2 },
    }));
    const pageNodes: PageNodeType[] = pages.map((pg) => ({
      id: pageNodeId(pg.id),
      type: "page",
      position: points.get(pageNodeId(pg.id)) ?? { x: 0, y: 0 },
      data: {
        name: pg.name,
        moduleKey: pg.moduleKey,
        tint: pageTint(pg),
        locked: !pg.hasAccess,
        extraPeople: pg.scopes.filter((s) => s.kind === "user").length,
        highlight: highlightId === pageNodeId(pg.id),
        onOpen: () => router.push(`/work/p/${pg.id}`),
      },
    }));
    // Пунктир от каждого, кому доступна страница (компания, подразделения).
    for (const pg of pages) {
      const sources = new Set<string>();
      for (const s of pg.scopes) {
        if (s.kind === "organization") sources.add(ROOT_ID);
        else if (s.kind === "unit" && s.unit_id && tree.byId.has(s.unit_id)) sources.add(s.unit_id);
      }
      // Страница только для отдельных людей — линия к компании, под которой она стоит.
      if (sources.size === 0) sources.add(ROOT_ID);
      for (const source of sources) {
        edgeList.push({
          id: `p-${pg.id}-${source}`,
          source,
          target: pageNodeId(pg.id),
          type: "default",
          selectable: false,
          style: {
            stroke: pg.hasAccess ? lineColor(source === ROOT_ID ? undefined : colors.get(source)) : "#d4d4d4",
            strokeWidth: 1.5,
            strokeDasharray: "6 5",
          },
        });
      }
    }
    const all: CanvasNode[] = [rootNode, ...unitNodes, ...pageNodes];
    // Кто чей «родитель» на холсте — чтобы ставить новые карточки рядом с ним.
    const parentOf = new Map<string, string>();
    for (const u of units) parentOf.set(u.id, u.parent_id && tree.byId.has(u.parent_id) ? u.parent_id : ROOT_ID);
    for (const pg of pages) parentOf.set(pageNodeId(pg.id), pageHome(order, pg.scopes) ?? ROOT_ID);
    return { layoutNodes: all, edges: edgeList, parentOf };
  }, [tree, colors, units, people.length, peopleById, expanded, canEdit, organization.name, organization.logoUrl, pages, router, menuFor, highlightId, onCreateUnit, pinLayout, dnd]);

  // Состояние карточек ведёт сам холст (рекомендованная схема React Flow): во время перетаскивания
  // меняется только передвигаемая карточка, а размеры, которые React Flow измерил, не теряются.
  // Первая отрисовка тоже проходит через сборку ниже — сразу с расстановкой человека,
  // а не сначала по автораскладке (иначе схема «прыгала» при первом движении).
  const [synced, setSynced] = useState<{ layoutNodes: CanvasNode[] | null; moved: Positions | null }>({ layoutNodes: null, moved: null });
  if (synced.layoutNodes !== layoutNodes || synced.moved !== moved) {
    // Данные или расстановка изменились — пересобираем карточки, сохраняя размеры и выделение.
    setSynced({ layoutNodes, moved });
    const before = new Map(nodes.map((n) => [n.id, n]));
    const sizeOf = (n: CanvasNode) => ({
      w: before.get(n.id)?.measured?.width ?? (n.type === "page" ? PAGE_W : CARD_W),
      h: before.get(n.id)?.measured?.height ?? (n.type === "root" ? ROOT_H : n.type === "page" ? PAGE_H : UNIT_H),
    });
    // Расставлено вручную: новые карточки ищут свободное место рядом с родителем.
    const placed = new Map<string, XYPosition>();
    if (moved.size > 0) {
      const at = (id: string) => moved.get(id) ?? placed.get(id);
      const rects: Rect[] = layoutNodes.flatMap((n) => (moved.has(n.id) ? [{ ...moved.get(n.id)!, ...sizeOf(n) }] : []));
      for (const n of layoutNodes) {
        if (moved.has(n.id)) continue;
        const parentId = parentOf.get(n.id);
        const parentNode = parentId ? layoutNodes.find((x) => x.id === parentId) : undefined;
        const parentPos = parentId ? at(parentId) : undefined;
        if (!parentNode || !parentPos) continue;
        const siblings = layoutNodes.flatMap((x) => {
          const p = x.id !== n.id && parentOf.get(x.id) === parentId ? at(x.id) : undefined;
          return p ? [{ ...p, ...sizeOf(x) }] : [];
        });
        const size = sizeOf(n);
        const pos = placeNear({ ...parentPos, ...sizeOf(parentNode) }, siblings, size, rects, GAP_X, GAP_Y);
        placed.set(n.id, pos);
        rects.push({ ...pos, ...size });
      }
    }
    setNodes(
      layoutNodes.map((n) => ({
        ...n,
        position: moved.get(n.id) ?? placed.get(n.id) ?? n.position,
        measured: before.get(n.id)?.measured,
        selected: before.get(n.id)?.selected ?? false, // выделение не сбрасывается при обновлении данных
      })) as CanvasNode[],
    );
    // Новые карточки тоже закрепляем, чтобы дальше они стояли на месте.
    if (placed.size > 0) setMoved(new Map([...moved, ...placed]));
  }

  // Сохраняем расстановку в базу через секунду после последнего изменения (не на каждое движение).
  // Храним только карточки, которые есть на холсте, — удалённые подразделения не копятся.
  const lastSaved = useRef(initial.saved);
  // Не успели сохранить, а человек ушёл со «Структуры» (например, создавать страницу) — дописываем при уходе.
  const pending = useRef<{ key: string; positions: Record<string, [number, number]> } | null>(null);
  const flush = useCallback(async () => {
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    const res = await saveCanvasPositions(organization.id, job.positions);
    if (res.error) return; // не сохранилось — попробуем при следующем изменении
    lastSaved.current = job.key;
    dropLegacyPositions(organization.id);
  }, [organization.id]);
  useEffect(() => {
    const key = keyOf(moved);
    if (key === lastSaved.current) return;
    const ids = new Set(nodesRef.current.map((n) => n.id));
    pending.current = { key, positions: toRecord(moved, ids.size > 0 ? ids : new Set(moved.keys())) };
    const id = setTimeout(() => void flush(), 1000);
    return () => clearTimeout(id);
  }, [moved, flush]);
  useEffect(() => () => void flush(), [flush]);

  // Новая карточка появилась — плавно показываем её и коротко подсвечиваем.
  const focusNode = focusId ? nodes.find((n) => n.id === focusId) : undefined;
  useEffect(() => {
    if (!focusNode || !rfRef.current) return;
    const rf = rfRef.current;
    const w = focusNode.measured?.width ?? (focusNode.type === "page" ? PAGE_W : CARD_W);
    const h = focusNode.measured?.height ?? (focusNode.type === "page" ? PAGE_H : UNIT_H);
    void rf.setCenter(focusNode.position.x + w / 2, focusNode.position.y + h / 2, { zoom: Math.max(rf.getZoom(), 0.8), duration: 500 });
    const id = focusNode.id;
    const show = setTimeout(() => {
      setFocusId(null);
      setHighlightId(id);
    }, 0);
    const hide = setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 2000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [focusNode]);

  const onNodesChange: OnNodesChange<CanvasNode> = useCallback((changes) => {
    setNodes((nds) => changes.applyTo(nds));
    // Конец перетаскивания — запоминаем позицию (одно обновление вместо обновления на каждый кадр).
    const finished = changes.getByType("position").filter((ch) => ch.dragging === false && ch.position);
    if (finished.length > 0) {
      setMoved((m) => {
        // Первое перемещение руками — запоминаем места всех карточек, чтобы остальные больше не прыгали.
        const next: Positions = m.size > 0 ? new Map(m) : new Map(nodesRef.current.map((n) => [n.id, n.position]));
        for (const ch of finished) next.set(ch.id, ch.position!);
        return next;
      });
    }
  }, []);

  const onInit = useCallback((rf: ReactFlowInstance<CanvasNode, Edge>) => {
    rfRef.current = rf;
  }, []);

  // Esc снимает выделение.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNodes((nds) => (nds.some((n) => n.selected) ? nds.map((n) => ({ ...n, selected: false })) : nds));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onAssign = useCallback(
    async (assign: Assign, move: boolean): Promise<{ error?: ErrorKey }> => {
      setPendingAssign({ assign, move });
      const res = move
        ? await moveUnitMember(organization.id, assign.userId, assign.toUnitId, assign.fromUnitId)
        : await addUnitMembers(organization.id, assign.toUnitId, [assign.userId]);
      if (res.error) {
        setPendingAssign(null);
        return res;
      }
      const who = peopleById.get(assign.userId);
      const unit = unitPath(tree, assign.toUnitId, " · ");
      setToast(format(move ? c.assignMoved : c.assignDone, { name: who ? fullName(who) : "", unit }));
      setHighlightId(assign.toUnitId);
      setTimeout(() => setHighlightId((cur) => (cur === assign.toUnitId ? null : cur)), 2000);
      return res;
    },
    [organization.id, peopleById, tree, c.assignMoved, c.assignDone],
  );
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const openUnit = shownUnitId ? tree.byId.get(shownUnitId) : undefined;
  // Подразделение удалили, пока панель была открыта, — панель закрывается.
  const sheetOpen = openUnitId !== null && !!tree.byId.get(openUnitId);
  const closeSheet = useCallback(() => setOpenUnitId(null), []);

  return (
    // touch-none и overscroll-none: жесты на холсте не прокручивают страницу и не «обновляют» её на телефоне.
    // Картинки (логотип, аватары) не перехватывают нажатия и не перетаскиваются браузером.
    <div
      className={`relative h-full w-full touch-none overscroll-none select-none [&_img]:pointer-events-none [-webkit-touch-callout:none] ${
        touch ? "" : "[&_.react-flow__pane]:cursor-default"
      }`}
    >
      <CanvasDnd enabled={canEdit} tree={tree} peopleById={peopleById} onAssign={onAssign}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        // При открытии вся структура по центру экрана (крупно, но не больше 100%).
        // Вернулись после создания страницы — вместо этого показываем новую карточку.
        fitView={!startFocus}
        fitViewOptions={{ padding: 0.15, maxZoom: 1, minZoom: 0.3 }}
        onNodesChange={onNodesChange}
        // Нажатие на пустое место холста закрывает меню «+».
        onPaneClick={() => setMenuFor(null)}
        // Перетаскивать карточки можно; короткое касание — это нажатие, а не перетаскивание.
        nodesDraggable
        nodeDragThreshold={8}
        nodesConnectable={false}
        // Компьютер (как в Figma): левая кнопка на пустом месте — рамка выделения, выделенное двигается разом;
        // карта — пробел + мышь или зажатое колёсико; Shift/Cmd/Ctrl + клик — добавить к выделению.
        // Телефон: один палец двигает карту, рамки нет.
        elementsSelectable={!touch}
        selectionOnDrag={!touch}
        selectionMode={SelectionMode.Partial}
        panOnDrag={touch ? true : [1]}
        panActivationKeyCode="Space"
        selectionKeyCode={null}
        multiSelectionKeyCode={["Meta", "Control", "Shift"]}
        // Клавишами ничего не удаляется: удалить подразделение можно только из панели.
        deleteKeyCode={null}
        minZoom={0.2}
        maxZoom={1.5}
        zoomOnDoubleClick={false}
        forceColorMode="light"
        proOptions={{ hideAttribution: true }}
      >
        {/* Фон «в точку», как блокнот. */}
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#cfc8c0" />
        {/* «Нераспределённые» видят только Owner и Admin — те, кто распределяет людей. */}
        {canEdit ? (
          <UnassignedList
            people={unassigned}
            dnd={dnd}
            onOpenPerson={(id) => router.push(`/work/people?member=${id}`)}
            onPick={setPickFor}
          />
        ) : null}
        <ZoomButtons />
        {units.length === 0 ? (
          <Panel position="bottom-center" className="mb-6! w-[calc(100%-2rem)] max-w-sm">
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-center shadow-sm">
              <p className="text-base text-ink">{canEdit ? c.emptyEditor : c.emptyViewer}</p>
              {canEdit ? (
                <Button type="button" onClick={() => setMenuFor(ROOT_ID)}>
                  {c.createFirst}
                </Button>
              ) : null}
            </div>
          </Panel>
        ) : null}
      </ReactFlow>

      {/* Телефон: выбор подразделения для нераспределённого, затем то же подтверждение. */}
      {canEdit ? (
        <PickUnitSheet
          person={pickFor ? shownPick : null}
          shown={shownPick}
          tree={tree}
          onClose={() => setPickFor(null)}
          onOpenCard={(id) => router.push(`/work/people?member=${id}`)}
        />
      ) : null}
      </CanvasDnd>

      {toast ? (
        <div role="status" className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <span className="animate-pop-in rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white shadow-lg">{toast}</span>
        </div>
      ) : null}

      <Sheet open={sheetOpen} title={openUnit?.name ?? ""} onClose={closeSheet}>
        {openUnit ? (
          <UnitPanel unit={openUnit} tree={tree} people={peopleById} organizationId={organization.id} canEdit={canEdit} />
        ) : null}
      </Sheet>
    </div>
  );
}

// Кнопки масштаба (подписи на русском), внутри ReactFlow — у них есть доступ к холсту.
// Справа внизу — под большой палец на телефоне. Движение плавное (~200 мс), без анимации,
// если в системе включено «Уменьшить движение».
function ZoomButtons() {
  const rf = useReactFlow();
  const c = t.canvas;
  const duration = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200);
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-[background-color,transform] duration-150 hover:bg-surface active:scale-95 active:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 md:h-10 md:w-10";
  return (
    <Panel
      position="bottom-right"
      className="m-3! mb-[calc(0.75rem+env(safe-area-inset-bottom))]! flex flex-col gap-0.5 rounded-2xl border border-line bg-white/95 p-1 shadow-[0_8px_24px_-10px_rgba(30,30,30,0.28)] backdrop-blur md:m-4!"
    >
      <button type="button" aria-label={c.zoomIn} title={c.zoomIn} onClick={() => void rf.zoomIn({ duration: duration() })} className={btn}>
        <ThinIcon d="M12 5v14M5 12h14" />
      </button>
      <button type="button" aria-label={c.zoomOut} title={c.zoomOut} onClick={() => void rf.zoomOut({ duration: duration() })} className={btn}>
        <ThinIcon d="M5 12h14" />
      </button>
      <span aria-hidden className="mx-2 h-px bg-line" />
      <button
        type="button"
        aria-label={c.fit}
        title={c.fit}
        onClick={() => void rf.fitView({ padding: 0.2, maxZoom: 1, duration: duration() })}
        className={btn}
      >
        <ThinIcon d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
      </button>
    </Panel>
  );
}

function ThinIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
      <path d={d} />
    </svg>
  );
}

// «Нераспределённые» — не на холсте, а компактное окно справа сверху. Нет таких людей — окна нет.
// Компьютер: раскрыто, человека тащат за всю строку на карточку подразделения (клик — карточка сотрудника).
// Телефон: свёрнуто (счётчик виден), нажатие на человека открывает выбор подразделения.
function UnassignedList({
  people,
  dnd,
  onOpenPerson,
  onPick,
}: {
  people: Member[];
  dnd: boolean;
  onOpenPerson: (userId: string) => void;
  onPick: (m: Member) => void;
}) {
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => false);
  // Пока пользователь сам не открыл или не закрыл — на компьютере раскрыто, на телефоне свёрнуто.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? desktop;
  const c = t.canvas;
  if (people.length === 0) return null;
  return (
    <Panel position="top-right" className="nopan nowheel m-3! w-56 max-w-[calc(100vw-1.5rem)] md:m-4! md:w-60">
      <div className="overflow-hidden rounded-2xl border border-line bg-white/95 shadow-[0_8px_24px_-12px_rgba(30,30,30,0.25)] backdrop-blur">
        <button
          type="button"
          onClick={() => setToggled(!open)}
          aria-expanded={open}
          className="flex h-11 w-full items-center gap-2 px-3.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface md:h-10"
        >
          <span className="min-w-0 flex-1 truncate text-left">{c.unassigned}</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold tabular-nums text-white">
            {people.length}
          </span>
          <ChevronDownIcon className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        <Collapse open={open}>
          <div className="border-t border-line">
            <p className="px-3.5 pt-2 text-[11px] leading-snug text-muted">{dnd ? c.dragHint : c.tapHint}</p>
            <ul className="max-h-64 overflow-y-auto p-1.5">
              {people.map((p) => {
                const name = fullName(p);
                return (
                  <li key={p.user_id}>
                    <DraggablePerson
                      person={p}
                      fromUnitId={null}
                      disabled={!dnd}
                      onClick={() => (dnd ? onOpenPerson(p.user_id) : onPick(p))}
                      // Тянуть можно за всю строку: курсор «рука», при нажатии строка приподнимается.
                      className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-[background-color,box-shadow,transform] duration-150 hover:bg-surface active:scale-[1.02] active:bg-white active:shadow-[0_8px_20px_-8px_rgba(30,30,30,0.35)]"
                    >
                      <ColorFace person={p} name={name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] leading-tight text-ink">{name}</span>
                        {p.position ? <span className="block truncate text-[12px] leading-tight text-muted">{p.position}</span> : null}
                      </span>
                      {dnd ? <GripIcon /> : null}
                    </DraggablePerson>
                  </li>
                );
              })}
            </ul>
          </div>
        </Collapse>
      </div>
    </Panel>
  );
}

const DESKTOP = "(min-width: 768px)";
function subscribeDesktop(cb: () => void) {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const isDesktop = () => window.matchMedia(DESKTOP).matches;

// Аватар нераспределённого: фото, а без фото — инициалы на цветном фоне (цвета веток «Структуры»;
// у человека постоянный цвет — от его id).
function ColorFace({ person, name }: { person: Member; name: string }) {
  if (person.avatar_url) return <Avatar url={person.avatar_url} name={name} size={32} />;
  let h = 0;
  for (const ch of person.user_id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const n = (h % 6) + 1;
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
      style={{ background: `var(--branch-${n}-chip)`, color: `var(--branch-${n}-text)` }}
    >
      {initials}
    </span>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

// Выбор подразделения на телефоне. Подтверждение показывает общий диалог (useAssign).
function PickUnitSheet({
  person,
  shown,
  tree,
  onClose,
  onOpenCard,
}: {
  person: Member | null;
  shown: Member | null;
  tree: ReturnType<typeof buildTree>;
  onClose: () => void;
  onOpenCard: (userId: string) => void;
}) {
  const { request } = useAssign();
  const c = t.canvas;
  const name = shown ? fullName(shown) : "";
  return (
    <Sheet open={person !== null} title={format(c.pickUnitFor, { name })} onClose={onClose}>
      {shown ? (
        <div className="flex flex-col gap-3">
          <UnitPicker
            key={shown.user_id}
            tree={tree}
            onPick={(unitId) => {
              onClose();
              request({ userId: shown.user_id, fromUnitId: null, toUnitId: unitId });
            }}
          />
          <button type="button" onClick={() => onOpenCard(shown.user_id)} className="h-11 text-[14px] font-medium text-ink underline underline-offset-4">
            {c.openCard}
          </button>
        </div>
      ) : null}
    </Sheet>
  );
}
