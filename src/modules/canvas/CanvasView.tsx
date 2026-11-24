"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Panel,
  ReactFlow,
  useReactFlow,
  type Edge,
  type OnNodesChange,
  type ReactFlowInstance,
  type XYPosition,
} from "@xyflow/react";
import type { Member } from "@/lib/company/queries";
import { format, t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { createUnit } from "./actions";
import { layoutTree, ROOT_ID } from "./layout";
import {
  CARD_W,
  nodeTypes,
  PERSON_H,
  ROOT_H,
  UNIT_H,
  type RootNodeType,
  type UnassignedNodeType,
  type UnitNodeType,
} from "./Nodes";
import { Sheet } from "./Sheet";
import { branchPeople, buildTree, unassignedIds, type UnitMemberRow, type UnitRow } from "./tree";
import { UnitForm } from "./UnitForm";
import { UnitPanel } from "./UnitPanel";

type Props = {
  organization: { id: string; name: string; logoUrl: string | null };
  units: UnitRow[];
  unitMembers: UnitMemberRow[];
  people: Member[];
  canEdit: boolean;
};

type CanvasNode = RootNodeType | UnitNodeType | UnassignedNodeType;

// Что открыто поверх холста.
type OpenSheet =
  | { kind: "unit"; id: string }
  | { kind: "add"; parentId: string | null } // выбор: подразделение или страница
  | { kind: "create"; parentId: string | null }
  | null;

const GAP_X = 32;
const GAP_Y = 64;

// Canvas (ТЗ, раздел 10): дерево компании с перемещением и масштабом.
export function CanvasView({ organization, units, unitMembers, people, canEdit }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<OpenSheet>(null);
  // Карточки, которые передвинули руками. Не сохраняются: после обновления страницы — автораскладка.
  const [moved, setMoved] = useState<Map<string, XYPosition>>(new Map());
  const onNodesChange: OnNodesChange<CanvasNode> = useCallback((changes) => {
    const drags = changes.getByType("position").filter((ch) => ch.position);
    if (drags.length === 0) return;
    setMoved((m) => {
      const next = new Map(m);
      for (const ch of drags) next.set(ch.id, ch.position!);
      return next;
    });
  }, []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const c = t.canvas;

  const tree = useMemo(() => buildTree(units, unitMembers), [units, unitMembers]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.user_id, p])), [people]);
  const freeCount = useMemo(
    () => unassignedIds(people.map((p) => p.user_id), unitMembers).length,
    [people, unitMembers],
  );

  const { nodes, edges } = useMemo(() => {
    const kids = (id: string) => (tree.children.get(id === ROOT_ID ? null : id) ?? []).map((u) => u.id);
    const height = (id: string) => {
      if (id === ROOT_ID) return ROOT_H;
      const n = tree.members.get(id)?.length ?? 0;
      return UNIT_H + (expanded.has(id) ? n * PERSON_H : 0);
    };
    const points = layoutTree({ children: kids, height, width: CARD_W, gapX: GAP_X, gapY: GAP_Y });

    const rootNode: RootNodeType = {
      id: ROOT_ID,
      type: "root",
      position: points.get(ROOT_ID) ?? { x: 0, y: 0 },
      data: {
        name: organization.name,
        logoUrl: organization.logoUrl,
        canEdit,
        onAdd: () => setSheet({ kind: "add", parentId: null }),
      },
    };
    const unassignedNode: UnassignedNodeType = {
      id: "unassigned",
      type: "unassigned",
      position: { x: (points.get(ROOT_ID)?.x ?? 0) + CARD_W + GAP_X, y: 0 },
      data: { count: freeCount },
    };
    const unitNodes: UnitNodeType[] = units.map((u) => {
      const direct = tree.members.get(u.id) ?? [];
      return {
        id: u.id,
        type: "unit",
        position: points.get(u.id) ?? { x: 0, y: 0 },
        data: {
          name: u.name,
          head: u.head_user_id ? peopleById.get(u.head_user_id) ?? null : null,
          direct: direct.length,
          branch: branchPeople(tree, u.id).size,
          people: direct.flatMap((id) => (peopleById.get(id) ? [peopleById.get(id)!] : [])),
          expanded: expanded.has(u.id),
          canEdit,
          onToggle: () =>
            setExpanded((s) => {
              const next = new Set(s);
              if (next.has(u.id)) next.delete(u.id);
              else next.add(u.id);
              return next;
            }),
          onOpen: () => setSheet({ kind: "unit", id: u.id }),
          onAdd: () => setSheet({ kind: "add", parentId: u.id }),
        },
      };
    });
    const edgeList: Edge[] = units.map((u) => ({
      id: `e-${u.id}`,
      source: u.parent_id && tree.byId.has(u.parent_id) ? u.parent_id : ROOT_ID,
      target: u.id,
      type: "default", // плавная кривая, как связи в Figma
      style: { stroke: "#a3a3a3", strokeWidth: 1.5 },
    }));
    const all: CanvasNode[] = [rootNode, unassignedNode, ...unitNodes];
    return { nodes: all.map((n) => (moved.has(n.id) ? { ...n, position: moved.get(n.id)! } : n)), edges: edgeList };
  }, [tree, units, peopleById, expanded, canEdit, organization, freeCount, moved]);

  // При первом открытии компания — по центру экрана по горизонтали, дерево ниже.
  const onInit = useCallback((rf: ReactFlowInstance<CanvasNode, Edge>) => {
    void rf.setCenter(0, ROOT_H / 2 + 160, { zoom: 0.85 });
  }, []);

  const openUnit = sheet?.kind === "unit" ? tree.byId.get(sheet.id) : undefined;
  const parentName = (id: string | null) => (id ? tree.byId.get(id)?.name ?? "" : organization.name);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        onNodesChange={onNodesChange}
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
        <Background gap={24} color="#e5e5e5" />
        <ZoomButtons canReset={moved.size > 0} onReset={() => setMoved(new Map())} />
        {units.length === 0 ? (
          <Panel position="bottom-center" className="mb-6! w-[calc(100%-2rem)] max-w-sm">
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-center shadow-sm">
              <p className="text-base text-neutral-700">{canEdit ? c.emptyEditor : c.emptyViewer}</p>
              {canEdit ? (
                <Button type="button" onClick={() => setSheet({ kind: "create", parentId: null })}>
                  {c.createFirst}
                </Button>
              ) : null}
            </div>
          </Panel>
        ) : null}
      </ReactFlow>

      {openUnit ? (
        <Sheet title={openUnit.name} onClose={closeSheet}>
          <UnitPanel
            unit={openUnit}
            tree={tree}
            people={peopleById}
            organizationId={organization.id}
            canEdit={canEdit}
          />
        </Sheet>
      ) : null}

      {sheet?.kind === "add" ? (
        <Sheet title={format(c.addTo, { name: parentName(sheet.parentId) })} onClose={closeSheet}>
          <div className="flex flex-col gap-3">
            <Button type="button" onClick={() => setSheet({ kind: "create", parentId: sheet.parentId })}>
              {c.addUnit}
            </Button>
            <Button type="button" variant="secondary" disabled>
              {c.addPage} · {c.soon}
            </Button>
          </div>
        </Sheet>
      ) : null}

      {sheet?.kind === "create" ? (
        <Sheet title={c.addUnit} onClose={closeSheet}>
          <p className="mb-4 text-sm text-neutral-500">{format(c.addTo, { name: parentName(sheet.parentId) })}</p>
          <UnitForm
            submitLabel={c.create}
            pendingLabel={c.creating}
            onSubmit={(name, address) =>
              createUnit({ organizationId: organization.id, parentId: sheet.parentId, name, address })
            }
            onDone={closeSheet}
          />
        </Sheet>
      ) : null}
    </div>
  );
}

// Кнопки масштаба (подписи на русском), внутри ReactFlow — у них есть доступ к холсту.
function ZoomButtons({ canReset, onReset }: { canReset: boolean; onReset: () => void }) {
  const rf = useReactFlow();
  const c = t.canvas;
  const btn =
    "flex h-10 w-10 items-center justify-center bg-white text-lg text-neutral-800 hover:bg-neutral-50 border-neutral-200";
  return (
    <Panel position="bottom-left" className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 shadow-sm">
      <button type="button" aria-label={c.zoomIn} onClick={() => void rf.zoomIn()} className={`${btn} border-b`}>
        +
      </button>
      <button type="button" aria-label={c.zoomOut} onClick={() => void rf.zoomOut()} className={`${btn} border-b`}>
        −
      </button>
      <button type="button" aria-label={c.fit} onClick={() => void rf.fitView({ padding: 0.2, maxZoom: 1 })} className={btn}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {canReset ? (
        <button type="button" aria-label={c.resetLayout} title={c.resetLayout} onClick={onReset} className={`${btn} border-t`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
    </Panel>
  );
}
