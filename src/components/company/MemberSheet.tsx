"use client";

import { ArrowRight, ArrowUpRight, CalendarBlank, IdentificationBadge, Plus, ShieldCheck, Star } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import type { Member } from "@/lib/company/queries";
import { removeMember, setMemberPosition, setMemberRole } from "@/lib/company/actions";
import { accessReasons, unitsOfUser, type AccessReason, type ScopeLite } from "@/lib/company/access";
import { fullName } from "@/lib/company/people";
import { canEditPosition, canManageMember, roleOptions, type Role } from "@/lib/company/permissions";
import { LIMITS } from "@/lib/company/validation";
import { Avatar } from "@/components/profile/Avatar";
import { dangerButton, primaryButton, PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { FormMessage } from "@/components/ui/FormMessage";
import { PopoverRow, Row, Section } from "@/components/ui/Grouped";
import { IconButton, LinkIcon, XIcon } from "@/components/ui/IconButton";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { PanelHeader } from "@/components/ui/Panel";
import { Sheet } from "@/components/ui/Sheet";
import { LockIcon } from "@/components/nav/icons";
import { PageIcon } from "@/components/ui/PageIcon";
import { addUnitMembers, moveUnitMember, removeUnitMember, type UnitResult } from "@/modules/canvas/actions";
import { branchColors, unitPath, type Tree } from "@/modules/canvas/tree";
import { grantPageUser, revokePageUser } from "@/modules/pages/actions";
import { childrenHint } from "./childrenHint";
import { UnitPicker } from "./UnitPicker";

// Рабочая страница для блока «Доступ к страницам». hasAccess — может ли её открыть тот, кто смотрит карточку.
export type PageInfo = { id: string; name: string; moduleKey: string; hasAccess: boolean; createdBy: string | null; scopes: ScopeLite[] };

type Props = {
  open: boolean;
  member: Member | null; // null — человека нет в компании (удалён или неверная ссылка)
  tree: Tree;
  pages: PageInfo[];
  organizationId: string;
  me: string;
  myRole: Role;
  onClose: () => void;
};

// Что сейчас раскрыто в карточке (одно действие за раз).
type Mode =
  | null
  | { kind: "addUnit" }
  | { kind: "askAddOrMove"; unitId: string }
  | { kind: "confirmAdd"; unitId: string } // в подразделении есть дочерние — подтверждаем с подсказкой
  | { kind: "moveFrom"; unitId: string }
  | { kind: "confirmMove"; from: string; to: string }
  | { kind: "removeUnit"; unitId: string }
  | { kind: "grant" }
  | { kind: "confirmGrant"; pageId: string }
  | { kind: "revoke"; pageId: string }
  | { kind: "removeMember" };

const noopSubscribe = () => () => {};
const ICON = 20;

// Карточка сотрудника справа (как карточка задачи). Видят все; Owner/Admin здесь же управляют:
// подразделения, индивидуальный доступ к страницам, роль, должность, удаление.
// Кнопки — только интерфейс: каждое изменение проверяют функции базы и RLS.
export function MemberSheet({ open, member, tree, pages, organizationId, me, myRole, onClose }: Props) {
  const c = t.company;
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Дата вступления — только в браузере: часовой пояс сервера и телефона может отличаться.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // Открыли другого человека — забываем прошлое действие и сообщения.
  const userId = member?.user_id ?? null;
  const [prevId, setPrevId] = useState(userId);
  if (userId !== prevId) {
    setPrevId(userId);
    setMode(null);
    setError(null);
    setNotice(null);
  }

  const colors = useMemo(() => branchColors(tree), [tree]);
  const myUnits = useMemo(() => (userId ? [...unitsOfUser(tree, userId)] : []), [tree, userId]);
  const headOf = useMemo(() => (userId ? [...tree.byId.values()].filter((u) => u.head_user_id === userId) : []), [tree, userId]);

  if (!member) {
    return (
      <Sheet open={open} from="right" title={c.memberTitle} onClose={onClose} header={<PanelHeader title={c.memberTitle} onClose={onClose} />}>
        <p className="pt-4 text-base text-muted">{c.memberGone}</p>
      </Sheet>
    );
  }

  const m = member;
  const name = fullName(m);
  const isManager = myRole === "owner" || myRole === "admin";
  const manageUnits = isManager; // распределять людей — Owner/Admin (ТЗ, раздел 6)
  const manageMember = canManageMember(myRole, m.role, m.user_id === me);
  const editPosition = canEditPosition(myRole);
  const seesAll = m.role === "owner" || m.role === "admin";
  const path = (id: string) => unitPath(tree, id, " · ");

  const withAccess = pages
    .map((p) => ({ page: p, reasons: accessReasons(p.scopes, tree, m.user_id, m.role) }))
    .filter((x) => x.reasons.length > 0)
    .sort((a, b) => a.page.name.localeCompare(b.page.name, "ru"));
  const grantable = seesAll ? [] : pages.filter((p) => accessReasons(p.scopes, tree, m.user_id, m.role).length === 0);
  // Owner/Admin меняют доступ к любой странице; Manager — только к своим (здесь карточкой управляют Owner/Admin).
  const manageAccess = isManager && !seesAll;

  function run(fn: () => Promise<UnitResult>, ok: string) {
    setError(null);
    setNotice(null);
    start(async () => {
      const res = await fn();
      if (res.error) return setError(res.error);
      setMode(null);
      setNotice(ok);
    });
  }

  function addTo(unitId: string) {
    run(() => addUnitMembers(organizationId, unitId, [m.user_id]), format(c.added, { unit: path(unitId) }));
  }
  function moveTo(to: string, from: string | null) {
    run(() => moveUnitMember(organizationId, m.user_id, to, from), format(c.moved, { unit: path(to) }));
  }

  // Нигде не состоит: в подразделение без дочерних — сразу, с дочерними — с подтверждением и подсказкой.
  // Уже где-то состоит — вопрос «Добавить / Перевести».
  function pickUnitToAdd(unitId: string) {
    if (myUnits.length > 0) return setMode({ kind: "askAddOrMove", unitId });
    if (childrenHint(tree, unitId, name)) return setMode({ kind: "confirmAdd", unitId });
    addTo(unitId);
  }

  function pickMoveTarget(to: string, from: string) {
    if (childrenHint(tree, to, name)) return setMode({ kind: "confirmMove", from, to });
    moveTo(to, from);
  }

  function submitForm(action: (prev: { error?: ErrorKey }, fd: FormData) => Promise<{ error?: ErrorKey }>, fields: Record<string, string>) {
    const fd = new FormData();
    fd.set("organization_id", organizationId);
    fd.set("user_id", m.user_id);
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    run(() => action({}, fd), c.saved);
  }

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href).then(() => setNotice(c.linkCopied), () => undefined);
  }

  const reasonText = (r: AccessReason) =>
    r.kind === "organization"
      ? c.reasonOrg
      : r.kind === "unit"
        ? format(r.child ? c.reasonChildUnit : c.reasonUnit, { unit: tree.byId.get(r.unitId)?.name ?? "" })
        : r.kind === "user"
          ? c.reasonUser
          : "";

  const header = (
    <PanelHeader title={c.memberTitle} onClose={onClose}>
      <MoreMenu tip="end" items={[{ key: "link", label: c.copyLink, icon: <LinkIcon />, onSelect: copyLink }]} />
    </PanelHeader>
  );

  const inherited = manageAccess && withAccess.some(({ reasons }) => reasons.some((r) => r.kind !== "user"));

  return (
    <Sheet open={open} from="right" title={name} onClose={onClose} header={header}>
      <div className="flex flex-col gap-6 pb-4 pt-2">
        {notice ? <FormMessage kind="notice">{notice}</FormMessage> : null}
        {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}

        {/* Шапка: фото, имя, должность, профиль. */}
        <div className="flex items-center gap-4 px-1">
          <Avatar url={m.avatar_url} name={name} size={72} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="break-words text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{name}</h2>
            {m.position ? <p className="truncate text-[14px] text-muted">{m.position}</p> : null}
            <Link
              href={`/@${m.username}`}
              className="mt-1 inline-flex h-8 w-fit items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:bg-line"
            >
              {c.openProfile}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <Section title={c.properties}>
          <PopoverRow
            popoverLabel={c.roleLabel}
            disabled={!manageMember}
            icon={<ShieldCheck size={ICON} />}
            label={c.role}
            value={c.roles[m.role]}
          >
            {(close) => (
              <div className="flex flex-col">
                {roleOptions(myRole).map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      close();
                      if (r !== m.role) submitForm(setMemberRole, { role: r });
                    }}
                    className={`flex h-10 items-center rounded-xl px-3 text-left text-[14px] text-ink transition-colors hover:bg-surface ${r === m.role ? "font-semibold" : ""}`}
                  >
                    {c.roles[r]}
                  </button>
                ))}
              </div>
            )}
          </PopoverRow>
          <PopoverRow
            popoverLabel={c.positionLabel}
            disabled={!editPosition}
            icon={<IdentificationBadge size={ICON} />}
            label={c.position}
            value={m.position || c.positionNone}
          >
            {(close) => (
              <PositionEditor
                key={m.user_id}
                initial={m.position ?? ""}
                pending={pending}
                onSave={(v) => {
                  close();
                  if (v.trim() !== (m.position ?? "")) submitForm(setMemberPosition, { position: v });
                }}
              />
            )}
          </PopoverRow>
          <Row icon={<CalendarBlank size={ICON} />} label={c.joined} value={mounted ? format(c.joinedSince, { date: formatDate(m.joined_at) }) : ""} />
          {headOf.length > 0 ? (
            <Row
              icon={<Star size={ICON} />}
              label={c.heads}
              top={headOf.length > 1}
              value={
                <span className="flex flex-col items-end gap-1 py-0.5">
                  {headOf.map((u) => (
                    <Dot key={u.id} color={colors.get(u.id)?.color ?? null} label={path(u.id)} />
                  ))}
                </span>
              }
            />
          ) : null}
        </Section>

        {/* Подразделения: где состоит; Owner/Admin — добавить, перевести, убрать. */}
        <Section title={myUnits.length > 0 ? `${c.unitsTitle} · ${myUnits.length}` : c.unitsTitle}>
          {myUnits.length === 0 ? <p className="px-3.5 py-3 text-[14px] text-muted">{c.unitsNone}</p> : null}
          {myUnits
            .map((id) => ({ id, label: path(id) }))
            .sort((a, b) => a.label.localeCompare(b.label, "ru"))
            .map(({ id, label }) => (
              <div key={id} className="group">
                <Row
                  icon={<ColorDot color={colors.get(id)?.color ?? null} />}
                  label={label}
                  right={
                    manageUnits ? (
                      <MoreMenu
                        size="sm"
                        tip="end"
                        label={c.unitActions}
                        items={[
                          { key: "move", label: c.moveTo, icon: <ArrowRight size={18} />, onSelect: () => setMode({ kind: "moveFrom", unitId: id }) },
                          { key: "remove", label: c.removeFromUnit, icon: <XIcon />, tone: "danger", onSelect: () => setMode({ kind: "removeUnit", unitId: id }) },
                        ]}
                      />
                    ) : null
                  }
                />
                <Collapse open={mode?.kind === "removeUnit" && mode.unitId === id}>
                  <Confirm
                    text={format(c.removeFromUnitConfirm, { name, unit: label })}
                    yes={c.removeFromUnit}
                    danger
                    pending={pending}
                    onYes={() => run(() => removeUnitMember(id, m.user_id), format(c.removedFromUnit, { unit: label }))}
                    onNo={() => setMode(null)}
                  />
                </Collapse>
                <Collapse open={mode?.kind === "moveFrom" && mode.unitId === id}>
                  {mode?.kind === "moveFrom" && mode.unitId === id ? (
                    <PickerBox title={format(c.moveFrom, { unit: label })} onCancel={() => setMode(null)}>
                      <UnitPicker tree={tree} disabled={new Set(myUnits)} autoFocus onPick={(to) => pickMoveTarget(to, id)} />
                    </PickerBox>
                  ) : null}
                </Collapse>
                <Collapse open={mode?.kind === "confirmMove" && mode.from === id}>
                  {mode?.kind === "confirmMove" && mode.from === id ? (
                    <Confirm
                      text={format(c.moveConfirm, { name, from: label, unit: path(mode.to) })}
                      note={childrenHint(tree, mode.to, name)}
                      yes={c.moveYes}
                      pending={pending}
                      onYes={() => moveTo(mode.to, id)}
                      onNo={() => setMode(null)}
                    />
                  ) : null}
                </Collapse>
              </div>
            ))}

          {manageUnits ? (
            <>
              <Collapse open={mode?.kind === "addUnit"}>
                {mode?.kind === "addUnit" ? (
                  <PickerBox title={c.addWhere} onCancel={() => setMode(null)}>
                    <UnitPicker tree={tree} disabled={new Set(myUnits)} autoFocus onPick={pickUnitToAdd} />
                  </PickerBox>
                ) : null}
              </Collapse>
              <Collapse open={mode?.kind === "askAddOrMove"}>
                {mode?.kind === "askAddOrMove" ? (
                  <div className="m-2 flex flex-col gap-3 rounded-2xl bg-white p-4">
                    <p className="text-[14px] text-ink">
                      {format(c.addOrMove, { name, units: myUnits.map((id) => `«${path(id)}»`).join(", "), unit: path(mode.unitId) })}
                    </p>
                    {childrenHint(tree, mode.unitId, name) ? <p className="-mt-1 text-[12px] text-muted">{childrenHint(tree, mode.unitId, name)}</p> : null}
                    <div className="flex flex-col gap-2">
                      <SecondaryButton size="sm" disabled={pending} onClick={() => addTo(mode.unitId)}>
                        {c.addKeep}
                      </SecondaryButton>
                      <PrimaryButton size="sm" disabled={pending} onClick={() => moveTo(mode.unitId, null)}>
                        {c.addMove}
                      </PrimaryButton>
                      <button type="button" onClick={() => setMode(null)} disabled={pending} className="h-10 text-[14px] text-muted hover:text-ink">
                        {c.cancel}
                      </button>
                    </div>
                  </div>
                ) : null}
              </Collapse>
              <Collapse open={mode?.kind === "confirmAdd"}>
                {mode?.kind === "confirmAdd" ? (
                  <Confirm
                    text={format(c.addConfirm, { name, unit: path(mode.unitId) })}
                    note={childrenHint(tree, mode.unitId, name)}
                    yes={c.addYes}
                    pending={pending}
                    onYes={() => addTo(mode.unitId)}
                    onNo={() => setMode(null)}
                  />
                ) : null}
              </Collapse>
              {mode?.kind !== "addUnit" && mode?.kind !== "askAddOrMove" && mode?.kind !== "confirmAdd" ? (
                <Row accent icon={<Plus size={ICON} />} label={c.addToUnit} onClick={() => setMode({ kind: "addUnit" })} />
              ) : null}
            </>
          ) : null}
        </Section>

        {/* Доступ к страницам: какие доступны и почему. */}
        <Section
          title={!seesAll && withAccess.length > 0 ? `${c.pagesTitle} · ${withAccess.length}` : c.pagesTitle}
          info={inherited ? c.inheritedHint : undefined}
          infoLabel={t.pages.info}
        >
          {seesAll ? <p className="px-3.5 py-3 text-[14px] text-muted">{format(c.pagesAll, { role: c.roles[m.role] })}</p> : null}
          {!seesAll && withAccess.length === 0 ? <p className="px-3.5 py-3 text-[14px] text-muted">{c.pagesNone}</p> : null}
          {!seesAll
            ? withAccess.map(({ page, reasons }) => {
                const individual = reasons.some((r) => r.kind === "user");
                const others = reasons.filter((r) => r.kind !== "user");
                return (
                  <div key={page.id} className="group">
                    <Row
                      icon={<PageBadge moduleKey={page.moduleKey} locked={!page.hasAccess} />}
                      label={
                        page.hasAccess ? (
                          <Link href={`/work/p/${page.id}`} className="hover:underline">
                            {page.name}
                          </Link>
                        ) : (
                          page.name
                        )
                      }
                      sub={reasons.map(reasonText).join(" · ")}
                      right={
                        manageAccess && individual ? (
                          <IconButton label={c.revoke} tip="end" tone="danger" onClick={() => setMode({ kind: "revoke", pageId: page.id })}>
                            <XIcon />
                          </IconButton>
                        ) : null
                      }
                    />
                    <Collapse open={mode?.kind === "revoke" && mode.pageId === page.id}>
                      <Confirm
                        text={
                          others.length > 0
                            ? format(c.revokeKeeps, { name, page: page.name, reasons: others.map(reasonText).join(", ") })
                            : format(c.revokeConfirm, { name, page: page.name })
                        }
                        yes={c.revokeYes}
                        danger
                        pending={pending}
                        onYes={() => run(() => revokePageUser(page.id, m.user_id), format(c.revoked, { page: page.name }))}
                        onNo={() => setMode(null)}
                      />
                    </Collapse>
                  </div>
                );
              })
            : null}

          {manageAccess ? (
            <>
              <Collapse open={mode?.kind === "grant"}>
                {mode?.kind === "grant" ? (
                  <PickerBox title={c.grantAccess} onCancel={() => setMode(null)}>
                    <PagePicker pages={grantable} onPick={(pageId) => setMode({ kind: "confirmGrant", pageId })} />
                  </PickerBox>
                ) : null}
              </Collapse>
              <Collapse open={mode?.kind === "confirmGrant"}>
                {mode?.kind === "confirmGrant" ? (
                  <Confirm
                    text={format(c.grantConfirm, { name, page: pages.find((p) => p.id === mode.pageId)?.name ?? "" })}
                    yes={c.grantYes}
                    pending={pending}
                    onYes={() =>
                      run(() => grantPageUser(mode.pageId, m.user_id), format(c.granted, { page: pages.find((p) => p.id === mode.pageId)?.name ?? "" }))
                    }
                    onNo={() => setMode(null)}
                  />
                ) : null}
              </Collapse>
              {mode?.kind !== "grant" && mode?.kind !== "confirmGrant" ? (
                <Row accent icon={<Plus size={ICON} />} label={c.grantAccess} onClick={() => setMode({ kind: "grant" })} />
              ) : null}
            </>
          ) : null}
        </Section>

        {/* Опасное — отдельной группой в конце, с подтверждением. */}
        {manageMember ? (
          <Section title={c.dangerZone}>
            <Row
              danger
              label={c.remove}
              expanded={mode?.kind === "removeMember"}
              onClick={() => setMode(mode?.kind === "removeMember" ? null : { kind: "removeMember" })}
            />
            <Collapse open={mode?.kind === "removeMember"}>
              <div className="flex flex-col gap-3 border-t-[0.5px] border-line px-3.5 py-3">
                <p className="text-[14px] text-ink">{format(c.removeConfirm, { name })}</p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMode(null)}
                    disabled={pending}
                    className="h-10 rounded-full px-4 text-[14px] font-medium text-ink hover:bg-black/5"
                  >
                    {c.cancel}
                  </button>
                  <button type="button" disabled={pending} onClick={() => submitForm(removeMember, {})} className={dangerButton("sm")}>
                    {pending ? c.removing : c.removeYes}
                  </button>
                </div>
              </div>
            </Collapse>
          </Section>
        ) : null}
      </div>
    </Sheet>
  );
}

// ---------- Детали ----------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

// Подразделение с точкой цвета направления.
function Dot({ color, label }: { color: number | null; label: string }) {
  const bg = color ? `var(--branch-${color}-bg)` : "var(--tandem-surface)";
  const dot = color ? `var(--branch-${color}-strong)` : "#a3a3a3";
  return (
    <span className="inline-flex h-6 min-w-0 max-w-full items-center gap-2 rounded-full pl-2 pr-2.5 text-[12px] font-medium text-ink" style={{ background: bg }}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

// Выбор внутри группы (подразделение, страница): белый блок с заголовком и крестиком.
function PickerBox({ title, onCancel, children }: { title: string; onCancel: () => void; children: React.ReactNode }) {
  return (
    <div className="m-2 flex flex-col gap-2 rounded-2xl bg-white p-3">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate pl-1 text-[13px] font-medium text-ink">{title}</p>
        <IconButton label={t.company.cancel} tip="end" onClick={onCancel} className="h-8! w-8!">
          <XIcon />
        </IconButton>
      </div>
      {children}
    </div>
  );
}

function Confirm({
  text,
  note = null,
  yes,
  danger = false,
  pending,
  onYes,
  onNo,
}: {
  text: string;
  note?: string | null; // мелкая подсказка под вопросом
  yes: string;
  danger?: boolean;
  pending: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="m-2 flex flex-col gap-3 rounded-2xl bg-white p-4">
      <p className={`text-[14px] ${danger ? "text-red-900" : "text-ink"}`}>{text}</p>
      {note ? <p className="-mt-1 text-[12px] text-muted">{note}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <SecondaryButton size="sm" onClick={onNo} disabled={pending}>
          {t.company.cancel}
        </SecondaryButton>
        <button type="button" disabled={pending} onClick={onYes} className={danger ? dangerButton("sm") : primaryButton("sm")}>
          {pending ? t.company.saving : yes}
        </button>
      </div>
    </div>
  );
}

function PositionEditor({ initial, pending, onSave }: { initial: string; pending: boolean; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  const c = t.company;
  return (
    <form
      className="flex flex-col gap-2 p-1"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(value);
      }}
    >
      <input
        autoFocus
        value={value}
        maxLength={LIMITS.position}
        onChange={(e) => setValue(e.target.value)}
        placeholder={c.positionPlaceholder}
        aria-label={c.positionLabel}
        className="h-11 w-full rounded-full bg-surface px-4 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink/15"
      />
      <PrimaryButton type="submit" size="sm" disabled={pending}>
        {c.save}
      </PrimaryButton>
    </form>
  );
}

function PagePicker({ pages, onPick }: { pages: PageInfo[]; onPick: (pageId: string) => void }) {
  const [query, setQuery] = useState("");
  const c = t.company;
  if (pages.length === 0) return <p className="px-1 py-2 text-[14px] text-muted">{c.grantNone}</p>;
  const q = query.trim().toLowerCase();
  const shown = [...pages].sort((a, b) => a.name.localeCompare(b.name, "ru")).filter((p) => !q || p.name.toLowerCase().includes(q));
  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={c.grantSearch}
        aria-label={c.grantSearch}
        className="h-11 w-full rounded-full bg-surface px-4 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink/15"
      />
      <ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain">
        {shown.length === 0 ? <li className="px-3 py-2.5 text-[14px] text-muted">{c.unitPickerNothing}</li> : null}
        {shown.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p.id)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left text-[14px] text-ink hover:bg-surface">
              <PageBadge moduleKey={p.moduleKey} locked={false} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageBadge({ moduleKey, locked }: { moduleKey: string; locked: boolean }) {
  if (!locked) return <PageIcon moduleKey={moduleKey} tile={32} onCard />;
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] bg-white text-ink" aria-hidden>
      <LockIcon className="h-4 w-4" />
    </span>
  );
}

// Цвет направления подразделения — точкой на месте иконки строки.
function ColorDot({ color }: { color: number | null }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ background: color ? `var(--branch-${color}-strong)` : "#a3a3a3" }} aria-hidden />;
}
