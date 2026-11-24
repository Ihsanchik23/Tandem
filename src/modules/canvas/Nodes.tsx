"use client";

import Link from "next/link";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { Member } from "@/lib/company/queries";
import { format, pluralRu, t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";

// Размеры карточек для раскладки (layout.ts). Высоты — с запасом, чтобы карточки не наезжали.
export const CARD_W = 240;
export const ROOT_H = 112;
export const UNIT_H = 184;
export const PERSON_H = 40;

export type RootData = { name: string; logoUrl: string | null; canEdit: boolean; onAdd: () => void };
export type UnitData = {
  name: string;
  head: Member | null;
  direct: number;
  branch: number;
  people: Member[];
  expanded: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onAdd: () => void;
};
export type UnassignedData = { count: number };

export type RootNodeType = Node<RootData, "root">;
export type UnitNodeType = Node<UnitData, "unit">;
export type UnassignedNodeType = Node<UnassignedData, "unassigned">;

// Невидимые точки крепления линий: сверху — от родителя, снизу — к детям.
function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} isConnectable={false} />
    </>
  );
}

function PlusButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="nodrag absolute -bottom-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-neutral-300 bg-white text-lg leading-none text-neutral-700 shadow-sm hover:bg-neutral-50"
    >
      +
    </button>
  );
}

export function RootNode({ data }: NodeProps<RootNodeType>) {
  return (
    <div
      className="relative flex flex-col items-center gap-2 rounded-2xl border-2 border-neutral-900 bg-white px-4 py-3 text-center"
      style={{ width: CARD_W }}
    >
      <Avatar url={data.logoUrl} name={data.name} size={48} shape="rounded" />
      <p className="line-clamp-2 break-words text-base font-semibold text-neutral-900">{data.name}</p>
      {data.canEdit ? <PlusButton onClick={data.onAdd} label={t.canvas.add} /> : null}
      <Handles />
    </div>
  );
}

export function UnitNode({ data }: NodeProps<UnitNodeType>) {
  const c = t.canvas;
  const headName = data.head ? `${data.head.first_name} ${data.head.last_name}`.trim() : null;
  return (
    <div className="relative rounded-2xl border border-neutral-300 bg-white shadow-sm" style={{ width: CARD_W }}>
      <button type="button" onClick={data.onOpen} className="flex w-full flex-col gap-2 px-4 pb-2 pt-3 text-left">
        <span className="line-clamp-2 break-words text-base font-semibold text-neutral-900">{data.name}</span>
        <span className="flex items-center gap-2">
          {data.head ? (
            <>
              <Avatar url={data.head.avatar_url} name={headName ?? ""} size={24} />
              <span className="truncate text-sm text-neutral-800">{headName}</span>
            </>
          ) : (
            <span className="text-sm text-neutral-400">{c.noHead}</span>
          )}
        </span>
        <span className="text-sm text-neutral-600">
          {data.direct} {pluralRu(data.direct, c.direct)}
          {data.branch !== data.direct ? ` · ${format(c.inBranch, { n: data.branch })}` : ""}
        </span>
      </button>

      {data.direct > 0 ? (
        <div className="border-t border-neutral-100 px-4 pb-4 pt-1">
          <button
            type="button"
            onClick={data.onToggle}
            aria-expanded={data.expanded}
            className="nodrag py-1 text-sm font-medium text-neutral-700 underline underline-offset-4"
          >
            {data.expanded ? c.hidePeople : c.showPeople}
          </button>
          {data.expanded ? (
            <ul className="flex flex-col">
              {data.people.map((p) => {
                const name = `${p.first_name} ${p.last_name}`.trim();
                return (
                  <li key={p.user_id} className="flex items-center gap-2" style={{ height: PERSON_H }}>
                    <Avatar url={p.avatar_url} name={name} size={28} />
                    <span className="truncate text-sm text-neutral-800">{name}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="pb-4" />
      )}

      {data.canEdit ? <PlusButton onClick={data.onAdd} label={format(c.addTo, { name: data.name })} /> : null}
      <Handles />
    </div>
  );
}

export function UnassignedNode({ data }: NodeProps<UnassignedNodeType>) {
  const c = t.canvas;
  return (
    <Link
      href="/work/people"
      className="flex flex-col gap-1 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3"
      style={{ width: CARD_W }}
    >
      <span className="text-base font-medium text-amber-900">{c.unassigned}</span>
      <span className="text-sm text-amber-900">
        {data.count} {pluralRu(data.count, c.direct)} · {c.unassignedOpen}
      </span>
    </Link>
  );
}

export const nodeTypes = { root: RootNode, unit: UnitNode, unassigned: UnassignedNode };
