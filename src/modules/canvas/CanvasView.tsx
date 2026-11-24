"use client";

import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  useReactFlow,
  type Edge,
  type OnNodesChange,
  type ReactFlowInstance,
  type XYPosition,
} from "@xyflow/react";
import type { Member } from "@/lib/company/queries";
import { t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import { ChevronDownIcon, FitIcon, MinusIcon, PlusIcon, UndoIcon } from "@/components/nav/icons";
import { Button } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { Sheet } from "@/components/ui/Sheet";
import { createUnit } from "./actions";
import { layoutTree, ROOT_ID } from "./layout";
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
import { branchColors, branchPeople, buildTree, pageHome, treeOrder, unassignedIds, type UnitMemberRow, type UnitRow } from "./tree";
import { UnitPanel } from "./UnitPanel";

type Props = {
  organization: { id: string; name: string; logoUrl: string | null };
  units: UnitRow[];
  unitMembers: UnitMemberRow[];
  people: Member[];
  canEdit: boolean;
  pages?: CanvasPage[]; // активные рабочие страницы компании
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

// Canvas (ТЗ, раздел 10): дерево компании с перемещением и масштабом.
export function CanvasView({ organization, units, unitMembers, people, canEdit, pages = [] }: Props) {
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
  const [focusId, setFocusId] = useState<string | null>(() => params.get("focus"));
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Карточки, которые передвинули руками (запоминаем, когда палец/мышь отпущены).
  // Не сохраняются: после обновления страницы — автораскладка.
  const [moved, setMoved] = useState<Map<string, XYPosition>>(new Map());
  const rfRef = useRef<ReactFlowInstance<CanvasNode, Edge> | null>(null);
  const c = t.canvas;

  const tree = useMemo(() => buildTree(units, unitMembers), [units, unitMembers]);
  const colors = useMemo(() => branchColors(tree), [tree]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.user_id, p])), [people]);
  const unassigned = useMemo(() => {
    const ids = new Set(unassignedIds(people.map((p) => p.user_id), unitMembers));
    return people.filter((p) => ids.has(p.user_id));
  }, [people, unitMembers]);

  const onCreateUnit = useCallback(
    async (parentId: string | null, name: string) => {
      const res = await createUnit({ organizationId: organization.id, parentId, name, address: "" });
      if (res.id) setFocusId(res.id);
      return res;
    },
    [organization.id],
  );

  const { layoutNodes, edges } = useMemo(() => {
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
      pageHref,
      highlight: highlightId === id,
    });

    const rootNode: RootNodeType = {
      id: ROOT_ID,
      type: "root",
      position: points.get(ROOT_ID) ?? { x: 0, y: 0 },
      zIndex: menuFor === ROOT_ID ? 1000 : 0,
      data: {
        ...menu(ROOT_ID, "/work/pages/new?scope=organization&from=canvas"),
        name: organization.name,
        logoUrl: organization.logoUrl,
        members: people.length,
        branches: tree.children.get(null)?.length ?? 0,
      },
    };
    const unitNodes: UnitNodeType[] = units.map((u) => {
      const direct = tree.members.get(u.id) ?? [];
      return {
        id: u.id,
        type: "unit",
        position: points.get(u.id) ?? { x: 0, y: 0 },
        zIndex: menuFor === u.id ? 1000 : 0,
        data: {
          ...menu(u.id, `/work/pages/new?unit=${u.id}&from=canvas`),
          name: u.name,
          tint: colors.get(u.id) ?? null,
          head: u.head_user_id ? (peopleById.get(u.head_user_id) ?? null) : null,
          direct: direct.length,
          branch: branchPeople(tree, u.id).size,
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
        },
      };
    });
    const edgeList: Edge[] = units.map((u) => ({
      id: `e-${u.id}`,
      source: u.parent_id && tree.byId.has(u.parent_id) ? u.parent_id : ROOT_ID,
      target: u.id,
      type: "default", // плавная кривая, как связи в Figma
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
          style: {
            stroke: pg.hasAccess ? lineColor(source === ROOT_ID ? undefined : colors.get(source)) : "#d4d4d4",
            strokeWidth: 1.5,
            strokeDasharray: "6 5",
          },
        });
      }
    }
    const all: CanvasNode[] = [rootNode, ...unitNodes, ...pageNodes];
    return { layoutNodes: all, edges: edgeList };
  }, [tree, colors, units, people.length, peopleById, expanded, canEdit, organization.name, organization.logoUrl, pages, router, menuFor, highlightId, onCreateUnit]);

  // Состояние карточек ведёт сам холст (рекомендованная схема React Flow): во время перетаскивания
  // меняется только передвигаемая карточка, а размеры, которые React Flow измерил, не теряются.
  const [nodes, setNodes] = useState<CanvasNode[]>(layoutNodes);
  const [synced, setSynced] = useState({ layoutNodes, moved });
  if (synced.layoutNodes !== layoutNodes || synced.moved !== moved) {
    // Данные или раскладка изменились — пересобираем карточки, сохраняя ручные позиции и размеры.
    setSynced({ layoutNodes, moved });
    setNodes((prev) => {
      const measured = new Map(prev.map((n) => [n.id, n.measured]));
      return layoutNodes.map((n) => ({
        ...n,
        position: moved.get(n.id) ?? n.position,
        measured: measured.get(n.id),
      })) as CanvasNode[];
    });
  }

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
        const next = new Map(m);
        for (const ch of finished) next.set(ch.id, ch.position!);
        return next;
      });
    }
  }, []);

  // При первом открытии компания — по центру экрана по горизонтали, дерево ниже.
  const onInit = useCallback((rf: ReactFlowInstance<CanvasNode, Edge>) => {
    rfRef.current = rf;
    void rf.setCenter(0, ROOT_H / 2 + 160, { zoom: 0.85 });
  }, []);

  const openUnit = shownUnitId ? tree.byId.get(shownUnitId) : undefined;
  // Подразделение удалили, пока панель была открыта, — панель закрывается.
  const sheetOpen = openUnitId !== null && !!tree.byId.get(openUnitId);
  const closeSheet = useCallback(() => setOpenUnitId(null), []);

  return (
    // touch-none и overscroll-none: жесты на холсте не прокручивают страницу и не «обновляют» её на телефоне.
    // Картинки (логотип, аватары) не перехватывают нажатия и не перетаскиваются браузером.
    <div className="relative h-full w-full touch-none overscroll-none select-none [&_img]:pointer-events-none [-webkit-touch-callout:none]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        onNodesChange={onNodesChange}
        // Нажатие на пустое место холста закрывает меню «+».
        onPaneClick={() => setMenuFor(null)}
        // Перетаскивать карточки можно; короткое касание — это нажатие, а не перетаскивание.
        nodesDraggable
        nodeDragThreshold={8}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.2}
        maxZoom={1.5}
        zoomOnDoubleClick={false}
        forceColorMode="light"
      >
        {/* Фон «в точку», как блокнот. */}
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#cfc8c0" />
        {/* «Нераспределённые» видят только Owner и Admin — те, кто распределяет людей. */}
        {canEdit ? <UnassignedList people={unassigned} /> : null}
        <ZoomButtons canReset={moved.size > 0} onReset={() => setMoved(new Map())} />
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

      <Sheet open={sheetOpen} title={openUnit?.name ?? ""} onClose={closeSheet}>
        {openUnit ? (
          <UnitPanel unit={openUnit} tree={tree} people={peopleById} organizationId={organization.id} canEdit={canEdit} />
        ) : null}
      </Sheet>
    </div>
  );
}

// Кнопки масштаба (подписи на русском), внутри ReactFlow — у них есть доступ к холсту.
function ZoomButtons({ canReset, onReset }: { canReset: boolean; onReset: () => void }) {
  const rf = useReactFlow();
  const c = t.canvas;
  const btn =
    "flex h-10 w-10 items-center justify-center bg-white text-lg text-ink hover:bg-neutral-50 border-neutral-200";
  return (
    <Panel position="bottom-left" className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 shadow-sm">
      <button type="button" aria-label={c.zoomIn} onClick={() => void rf.zoomIn()} className={`${btn} border-b`}>
        <PlusIcon className="h-5 w-5" />
      </button>
      <button type="button" aria-label={c.zoomOut} onClick={() => void rf.zoomOut()} className={`${btn} border-b`}>
        <MinusIcon className="h-5 w-5" />
      </button>
      <button type="button" aria-label={c.fit} onClick={() => void rf.fitView({ padding: 0.2, maxZoom: 1 })} className={btn}>
        <FitIcon className="h-5 w-5" />
      </button>
      {canReset ? (
        <button type="button" aria-label={c.resetLayout} title={c.resetLayout} onClick={onReset} className={`${btn} border-t`}>
          <UndoIcon className="h-5 w-5" />
        </button>
      ) : null}
    </Panel>
  );
}

// «Нераспределённые» — не на холсте, а раскрывающийся список справа сверху.
function UnassignedList({ people }: { people: Member[] }) {
  const [open, setOpen] = useState(false);
  const c = t.canvas;
  return (
    <Panel position="top-right" className="w-64 max-w-[calc(100vw-2rem)]">
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between gap-2 px-3 text-sm font-medium text-ink hover:bg-neutral-50"
        >
          <span>
            {c.unassigned} · {people.length}
          </span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        <Collapse open={open}>
          {people.length === 0 ? (
            <p className="border-t border-neutral-100 px-3 py-3 text-sm text-ink">{c.unassignedEmpty}</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto border-t border-neutral-100">
              {people.map((p) => {
                const name = `${p.first_name} ${p.last_name}`.trim();
                return (
                  <li key={p.user_id}>
                    <Link href={`/work/people/${p.user_id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50">
                      <Avatar url={p.avatar_url} name={name} size={28} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink">{name}</span>
                        {p.position ? <span className="block truncate text-xs text-ink">{p.position}</span> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Collapse>
      </div>
    </Panel>
  );
}
