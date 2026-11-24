"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { Member } from "@/lib/company/queries";
import { format, pluralRu, t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";

// Размеры карточек для раскладки (layout.ts). Высоты — с запасом, чтобы карточки не наезжали.
export const CARD_W = 240;
export const ROOT_H = 150;
export const UNIT_H = 150;
export const PERSON_H = 40;

export type RootData = {
  name: string;
  logoUrl: string | null;
  members: number; // сотрудников в компании
  branches: number; // подразделений первого уровня
  units: number; // всего подразделений
  canEdit: boolean;
  onAdd: () => void;
};
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

export type RootNodeType = Node<RootData, "root">;
export type UnitNodeType = Node<UnitData, "unit">;

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

// Карточка компании: круглый логотип, название, сотрудники, ветки и все подразделения.
export function RootNode({ data }: NodeProps<RootNodeType>) {
  const c = t.canvas;
  const stats = [
    `${data.members} ${pluralRu(data.members, c.direct)}`,
    `${data.branches} ${pluralRu(data.branches, c.branchForms)}`,
    `${data.units} ${pluralRu(data.units, c.unitForms)}`,
  ];
  return (
    <div
      className="relative flex flex-col items-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 pb-6 pt-4 text-center shadow-sm"
      style={{ width: CARD_W }}
    >
      <Avatar url={data.logoUrl} name={data.name} size={48} />
      <p className="line-clamp-2 break-words text-base font-semibold text-ink">{data.name}</p>
      <p className="text-xs leading-5 text-neutral-500">{stats.join(" · ")}</p>
      {data.canEdit ? <PlusButton onClick={data.onAdd} label={c.add} /> : null}
      <Handles />
    </div>
  );
}

export function UnitNode({ data }: NodeProps<UnitNodeType>) {
  const c = t.canvas;
  const headName = data.head ? `${data.head.first_name} ${data.head.last_name}`.trim() : null;
  const count = `${data.direct} ${pluralRu(data.direct, c.direct)}`;
  return (
    <div className="relative rounded-2xl border border-neutral-300 bg-white pb-5 shadow-sm" style={{ width: CARD_W }}>
      {/* Нажатие на название — панель подразделения. */}
      <button type="button" onClick={data.onOpen} className="flex w-full flex-col gap-2 px-4 pb-1 pt-3 text-left">
        <span className="line-clamp-2 break-words text-base font-semibold text-ink">{data.name}</span>
        {data.head ? (
          <span className="flex items-center gap-2">
            <Avatar url={data.head.avatar_url} name={headName ?? ""} size={24} />
            <span className="truncate text-sm text-neutral-800">{headName}</span>
          </span>
        ) : null}
      </button>

      <div className="px-4">
        {/* «N сотрудников» сам раскрывает список; при 0 — просто текст. */}
        {data.direct > 0 ? (
          <button
            type="button"
            onClick={data.onToggle}
            aria-expanded={data.expanded}
            className="nodrag flex items-center gap-1 py-1 text-sm text-neutral-700 hover:text-ink"
          >
            {count}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
              className={`transition-transform ${data.expanded ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <p className="py-1 text-sm text-neutral-500">{count}</p>
        )}
        {data.branch !== data.direct ? (
          <p className="text-xs text-neutral-500">{format(c.inBranch, { n: data.branch })}</p>
        ) : null}

        {data.expanded ? (
          <ul className="mt-1 flex flex-col">
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

      {data.canEdit ? <PlusButton onClick={data.onAdd} label={format(c.addTo, { name: data.name })} /> : null}
      <Handles />
    </div>
  );
}

export const nodeTypes = { root: RootNode, unit: UnitNode };
