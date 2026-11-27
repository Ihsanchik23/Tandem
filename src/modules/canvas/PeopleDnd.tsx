"use client";

// Распределение людей на холсте (ТЗ, раздел 10, «после MVP»: перетаскивание с выбором «Добавить / Перевести»).
// Компьютер: человека из «Нераспределённых» или из раскрытого списка на карточке тащат на карточку подразделения;
// под курсором едет аватар с именем, подходящая карточка подсвечивается; после отпускания — подтверждение.
// Телефон: перетаскивания нет — выбор подразделения из списка и то же подтверждение.
// Только Owner/Admin; права проверяют RLS и move_unit_member.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Member } from "@/lib/company/queries";
import { fullName } from "@/lib/company/people";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Avatar } from "@/components/profile/Avatar";
import { primaryButton, secondaryButton } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { childrenHint } from "@/components/company/childrenHint";
import { unitPath, type Tree } from "./tree";

// Кого тащат и откуда (null — из «Нераспределённых»).
export type DragPerson = { userId: string; fromUnitId: string | null };
// Что подтверждают: куда добавить; move — убрать из fromUnitId.
export type Assign = DragPerson & { toUnitId: string };

type Ctx = {
  active: DragPerson | null;
  request: (a: Assign) => void; // показать подтверждение (с холста или из выбора на телефоне)
  isMember: (unitId: string, userId: string) => boolean;
};
const AssignContext = createContext<Ctx>({ active: null, request: () => {}, isMember: () => false });
export const useAssign = () => useContext(AssignContext);

type Props = {
  enabled: boolean; // Owner/Admin
  tree: Tree;
  peopleById: Map<string, Member>;
  onAssign: (a: Assign, move: boolean) => Promise<{ error?: ErrorKey }>;
  children: React.ReactNode;
};

export function CanvasDnd({ enabled, tree, peopleById, onAssign, children }: Props) {
  const [active, setActive] = useState<DragPerson | null>(null);
  const [asking, setAsking] = useState<Assign | null>(null);
  // Мышь: перетаскивание начинается после сдвига на 6 px — обычный клик остаётся кликом.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const isMember = (unitId: string, userId: string) => (tree.members.get(unitId) ?? []).includes(userId);

  function onDragStart(e: DragStartEvent) {
    setActive((e.active.data.current as DragPerson | undefined) ?? null);
  }
  function onDragEnd(e: DragEndEvent) {
    const who = e.active.data.current as DragPerson | undefined;
    const to = e.over?.data.current?.unitId as string | undefined;
    setActive(null);
    if (!who || !to || isMember(to, who.userId)) return;
    setAsking({ ...who, toUnitId: to });
  }

  const person = active ? peopleById.get(active.userId) : undefined;

  return (
    <AssignContext.Provider value={{ active, request: setAsking, isMember }}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
        // Подсказки для экранного диктора — по-русски.
        accessibility={{
          screenReaderInstructions: { draggable: t.canvas.dragHint },
          announcements: {
            onDragStart: () => "",
            onDragOver: () => "",
            onDragEnd: () => "",
            onDragCancel: () => "",
          },
        }}
      >
        {children}
        {/* Под курсором — аватар с именем. Без анимации возврата: после отпускания сразу подтверждение. */}
        <DragOverlay dropAnimation={null} zIndex={60}>
          {enabled && person ? (
            <div className="pointer-events-none flex h-11 w-max max-w-64 -rotate-2 items-center gap-2 rounded-full bg-white py-1 pl-1 pr-4 shadow-[0_16px_36px_-8px_rgba(30,30,30,0.35)] ring-1 ring-black/5">
              <Avatar url={person.avatar_url} name={fullName(person)} size={34} />
              <span className="truncate text-[14px] font-semibold text-ink">{fullName(person)}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {asking ? (
        <AssignDialog
          key={`${asking.userId}-${asking.toUnitId}`}
          assign={asking}
          tree={tree}
          person={peopleById.get(asking.userId)}
          onClose={() => setAsking(null)}
          onConfirm={onAssign}
        />
      ) : null}
    </AssignContext.Provider>
  );
}

// Человек, которого можно перетащить. Клик без перетаскивания — onClick (открыть карточку и т. п.).
// nodrag/nopan: React Flow не двигает ни карточку, ни холст, пока тащат человека.
export function DraggablePerson({
  person,
  fromUnitId,
  disabled,
  onClick,
  className = "",
  children,
}: {
  person: Member;
  fromUnitId: string | null;
  disabled: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `person:${fromUnitId ?? "free"}:${person.user_id}`,
    data: { userId: person.user_id, fromUnitId } satisfies DragPerson,
    disabled,
  });
  // После перетаскивания браузер всё равно пришлёт «клик» — его пропускаем.
  const dragged = useRef(false);
  useEffect(() => {
    if (isDragging) dragged.current = true;
  }, [isDragging]);

  if (disabled) {
    return onClick ? (
      <button type="button" onClick={onClick} className={`w-full text-left ${className}`}>
        {children}
      </button>
    ) : (
      <div className={className}>{children}</div>
    );
  }
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={format(t.canvas.dragPerson, { name: fullName(person) })}
      onClick={() => {
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        onClick?.();
      }}
      className={`nodrag nopan touch-none cursor-grab select-none active:cursor-grabbing ${isDragging ? "opacity-40" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// Карточка подразделения как место, куда можно отпустить человека.
// over — человека держат над карточкой и его можно сюда добавить (он ещё не здесь).
export function useUnitDrop(unitId: string, enabled: boolean) {
  const { active, isMember } = useAssign();
  const { setNodeRef, isOver } = useDroppable({ id: `unit:${unitId}`, data: { unitId }, disabled: !enabled });
  const suitable = !!active && !isMember(unitId, active.userId);
  return { setNodeRef, over: enabled && isOver && suitable };
}

// Подтверждение: «Добавить?» или, если человек уже в другом подразделении, «Добавить / Перевести».
function AssignDialog({
  assign,
  tree,
  person,
  onClose,
  onConfirm,
}: {
  assign: Assign;
  tree: Tree;
  person: Member | undefined;
  onClose: () => void;
  onConfirm: (a: Assign, move: boolean) => Promise<{ error?: ErrorKey }>;
}) {
  const c = t.canvas;
  const [error, setError] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const name = person ? fullName(person) : "";
  const unit = unitPath(tree, assign.toUnitId, " · ");
  const from = assign.fromUnitId ? unitPath(tree, assign.fromUnitId, " · ") : null;
  // В подразделении есть дочерние — человек увидит и их рабочие страницы.
  const kidsHint = childrenHint(tree, assign.toUnitId, name);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function confirm(move: boolean) {
    setBusy(true);
    setError(null);
    const res = await onConfirm(assign, move);
    setBusy(false);
    if (res.error) return setError(res.error);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:items-center">
      <button type="button" aria-label={c.assignCancel} tabIndex={-1} onClick={() => !busy && onClose()} className="absolute inset-0 animate-fade-in bg-black/20" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={from ? format(c.assignAddOrMove, { name, from, unit }) : format(c.assignAdd, { name, unit })}
        className="relative flex w-full max-w-sm animate-pop-in flex-col gap-4 rounded-3xl bg-white p-5 shadow-[0_24px_60px_-12px_rgba(30,30,30,0.35)]"
      >
        <div className="flex items-center gap-3">
          {person ? <Avatar url={person.avatar_url} name={name} size={44} /> : null}
          <p className="min-w-0 flex-1 text-[16px] font-semibold leading-snug text-ink">
            {from ? format(c.assignAddOrMove, { name, from, unit }) : format(c.assignAdd, { name, unit })}
          </p>
        </div>
        {from ? <p className="-mt-2 text-[13px] text-muted">{format(c.assignAddKeep, { from })}</p> : null}
        {kidsHint ? <p className="-mt-2 text-[12px] text-muted">{kidsHint}</p> : null}
        {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          {from ? (
            <>
              <button type="button" autoFocus disabled={busy} onClick={() => confirm(true)} className={`${primaryButton()} sm:flex-1`}>
                {busy ? c.saving : c.assignMove}
              </button>
              <button type="button" disabled={busy} onClick={() => confirm(false)} className={`${secondaryButton()} sm:flex-1`}>
                {c.assignYes}
              </button>
            </>
          ) : (
            <button type="button" autoFocus disabled={busy} onClick={() => confirm(false)} className={`${primaryButton()} sm:flex-1`}>
              {busy ? c.saving : c.assignYes}
            </button>
          )}
          <button type="button" disabled={busy} onClick={onClose} className="h-11 rounded-full px-4 text-[14px] font-medium text-muted hover:text-ink">
            {c.assignCancel}
          </button>
        </div>
      </div>
    </div>
  );
}
