"use client";

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
import { btnPrimary, btnSecondary, CardHeader, FieldPopover, Prop } from "@/components/ui/Card";
import { Collapse } from "@/components/ui/Collapse";
import { FormMessage } from "@/components/ui/FormMessage";
import { IconButton, LinkIcon, TrashIcon, XIcon } from "@/components/ui/IconButton";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { Sheet } from "@/components/ui/Sheet";
import { ChatPageIcon, LockIcon, TasksPageIcon } from "@/components/nav/icons";
import { addUnitMembers, moveUnitMember, removeUnitMember, type UnitResult } from "@/modules/canvas/actions";
import { branchColors, unitPath, type Tree } from "@/modules/canvas/tree";
import { grantPageUser, revokePageUser } from "@/modules/pages/actions";
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
  | { kind: "moveFrom"; unitId: string }
  | { kind: "removeUnit"; unitId: string }
  | { kind: "grant" }
  | { kind: "confirmGrant"; pageId: string }
  | { kind: "revoke"; pageId: string }
  | { kind: "removeMember" };

const noopSubscribe = () => () => {};

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
      <Sheet open={open} from="right" title={c.memberTitle} onClose={onClose} header={<CardHeader title={c.memberTitle} onClose={onClose} />}>
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

  function pickUnitToAdd(unitId: string) {
    if (myUnits.length === 0) return run(() => addUnitMembers(organizationId, unitId, [m.user_id]), format(c.added, { unit: path(unitId) }));
    setMode({ kind: "askAddOrMove", unitId });
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
    r.kind === "organization" ? c.reasonOrg : r.kind === "unit" ? format(c.reasonUnit, { unit: tree.byId.get(r.unitId)?.name ?? "" }) : r.kind === "user" ? c.reasonUser : "";

  const header = (
    <CardHeader title={c.memberTitle} onClose={onClose}>
      <MoreMenu
        tip="end"
        items={[
          { key: "link", label: c.copyLink, icon: <LinkIcon />, onSelect: copyLink },
          ...(manageMember ? [{ key: "remove", label: c.remove, icon: <TrashIcon />, tone: "danger" as const, onSelect: () => setMode({ kind: "removeMember" }) }] : []),
        ]}
      />
    </CardHeader>
  );

  return (
    <Sheet open={open} from="right" title={name} onClose={onClose} header={header}>
      <div className="flex flex-col gap-7 pb-4 pt-4">
        {/* Удаление из компании — подтверждение сверху, на виду. */}
        {mode?.kind === "removeMember" ? (
          <div className="flex animate-fade-in flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-[15px] text-red-900">{format(c.removeConfirm, { name })}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => submitForm(removeMember, {})}
                className={`${btnPrimary} bg-red-700! hover:bg-red-800!`}
              >
                {pending ? c.removing : c.removeYes}
              </button>
              <button type="button" onClick={() => setMode(null)} disabled={pending} className={btnSecondary}>
                {c.cancel}
              </button>
            </div>
          </div>
        ) : null}

        {notice ? <FormMessage kind="notice">{notice}</FormMessage> : null}
        {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}

        {/* Шапка: фото, имя, должность, профиль. */}
        <div className="flex items-center gap-4">
          <Avatar url={m.avatar_url} name={name} size={72} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="break-words text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{name}</h2>
            {m.position ? <p className="truncate text-[14px] text-muted">{m.position}</p> : null}
            <Link
              href={`/@${m.username}`}
              className="mt-1 inline-flex h-8 w-fit items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:bg-neutral-200"
            >
              {c.openProfile}
              <ArrowIcon />
            </Link>
          </div>
        </div>

        {/* Свойства: иконка и название слева, значение справа. */}
        <dl className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-[14px]">
          <Prop icon={<ShieldIcon />} label={c.role}>
            {manageMember ? (
              <FieldPopover label={c.roleLabel} value={c.roles[m.role]}>
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
                        className={`flex h-10 items-center rounded-xl px-3 text-left text-[14px] transition-colors hover:bg-surface ${r === m.role ? "font-semibold text-ink" : "text-ink"}`}
                      >
                        {c.roles[r]}
                      </button>
                    ))}
                  </div>
                )}
              </FieldPopover>
            ) : (
              <span>{c.roles[m.role]}</span>
            )}
          </Prop>
          <Prop icon={<BadgeIcon />} label={c.position}>
            {editPosition ? (
              <FieldPopover label={c.positionLabel} value={m.position || <span className="text-muted">{c.positionNone}</span>}>
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
              </FieldPopover>
            ) : (
              <span className={m.position ? "truncate" : "text-muted"}>{m.position || c.positionNone}</span>
            )}
          </Prop>
          <Prop icon={<CalendarIcon />} label={c.joined}>
            <span>{mounted ? format(c.joinedSince, { date: formatDate(m.joined_at) }) : ""}</span>
          </Prop>
          {headOf.length > 0 ? (
            <Prop icon={<StarIcon />} label={c.heads} top={headOf.length > 1}>
              <span className="flex flex-wrap gap-1.5 py-1.5">
                {headOf.map((u) => (
                  <Dot key={u.id} color={colors.get(u.id)?.color ?? null} label={path(u.id)} />
                ))}
              </span>
            </Prop>
          ) : null}
        </dl>

        {/* Подразделения: где состоит; Owner/Admin — добавить, перевести, убрать. */}
        <section className="flex flex-col gap-2">
          <SectionTitle icon={<UnitIcon />} title={c.unitsTitle} count={myUnits.length} />
          {myUnits.length === 0 ? <p className="text-[14px] text-muted">{c.unitsNone}</p> : null}
          <ul className="flex flex-col">
            {myUnits
              .map((id) => ({ id, label: path(id) }))
              .sort((a, b) => a.label.localeCompare(b.label, "ru"))
              .map(({ id, label }) => (
                <li key={id} className="flex flex-col">
                  <div className="flex min-h-11 items-center gap-2.5 rounded-xl pl-1">
                    <Dot color={colors.get(id)?.color ?? null} label={label} big />
                    <span className="flex-1" />
                    {manageUnits ? (
                      <MoreMenu
                        size="sm"
                        tip="end"
                        label={c.unitActions}
                        items={[
                          { key: "move", label: c.moveTo, icon: <MoveIcon />, onSelect: () => setMode({ kind: "moveFrom", unitId: id }) },
                          { key: "remove", label: c.removeFromUnit, icon: <XIcon />, tone: "danger", onSelect: () => setMode({ kind: "removeUnit", unitId: id }) },
                        ]}
                      />
                    ) : null}
                  </div>
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
                        <UnitPicker
                          tree={tree}
                          disabled={new Set(myUnits)}
                          autoFocus
                          onPick={(to) => run(() => moveUnitMember(organizationId, m.user_id, to, id), format(c.moved, { unit: path(to) }))}
                        />
                      </PickerBox>
                    ) : null}
                  </Collapse>
                </li>
              ))}
          </ul>

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
                  <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
                    <p className="text-[14px] text-ink">
                      {format(c.addOrMove, { name, units: myUnits.map((id) => `«${path(id)}»`).join(", "), unit: path(mode.unitId) })}
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => addUnitMembers(organizationId, mode.unitId, [m.user_id]), format(c.added, { unit: path(mode.unitId) }))}
                        className={btnSecondary + " bg-white! hover:bg-neutral-100!"}
                      >
                        {c.addKeep}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => moveUnitMember(organizationId, m.user_id, mode.unitId, null), format(c.moved, { unit: path(mode.unitId) }))}
                        className={btnPrimary}
                      >
                        {c.addMove}
                      </button>
                      <button type="button" onClick={() => setMode(null)} disabled={pending} className="h-10 text-[14px] text-muted hover:text-ink">
                        {c.cancel}
                      </button>
                    </div>
                  </div>
                ) : null}
              </Collapse>
              {mode?.kind !== "addUnit" && mode?.kind !== "askAddOrMove" ? (
                <AddButton label={c.addToUnit} onClick={() => setMode({ kind: "addUnit" })} />
              ) : null}
            </>
          ) : null}
        </section>

        {/* Доступ к страницам: какие доступны и почему. */}
        <section className="flex flex-col gap-2">
          <SectionTitle icon={<PagesIcon />} title={c.pagesTitle} count={seesAll ? null : withAccess.length} />
          {seesAll ? <p className="text-[14px] text-muted">{format(c.pagesAll, { role: c.roles[m.role] })}</p> : null}
          {!seesAll && withAccess.length === 0 ? <p className="text-[14px] text-muted">{c.pagesNone}</p> : null}
          {!seesAll ? (
            <ul className="flex flex-col">
              {withAccess.map(({ page, reasons }) => {
                const individual = reasons.some((r) => r.kind === "user");
                const others = reasons.filter((r) => r.kind !== "user");
                return (
                  <li key={page.id} className="flex flex-col">
                    <div className="flex min-h-12 items-center gap-3 py-1">
                      <PageBadge moduleKey={page.moduleKey} locked={!page.hasAccess} />
                      <span className="min-w-0 flex-1">
                        {page.hasAccess ? (
                          <Link href={`/work/p/${page.id}`} className="block truncate text-[14px] font-medium text-ink hover:underline">
                            {page.name}
                          </Link>
                        ) : (
                          <span className="block truncate text-[14px] font-medium text-ink">{page.name}</span>
                        )}
                        <span className="block truncate text-[12px] text-muted">{reasons.map(reasonText).join(" · ")}</span>
                      </span>
                      {manageAccess && individual ? (
                        <IconButton label={c.revoke} tip="end" tone="danger" onClick={() => setMode({ kind: "revoke", pageId: page.id })}>
                          <XIcon />
                        </IconButton>
                      ) : null}
                    </div>
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
                  </li>
                );
              })}
            </ul>
          ) : null}

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
              {mode?.kind !== "grant" && mode?.kind !== "confirmGrant" ? <AddButton label={c.grantAccess} onClick={() => setMode({ kind: "grant" })} /> : null}
              {withAccess.some(({ reasons }) => reasons.some((r) => r.kind !== "user")) ? (
                <p className="flex gap-2 pt-1 text-[12px] leading-relaxed text-muted">
                  <InfoIcon />
                  {c.inheritedHint}
                </p>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </Sheet>
  );
}

// ---------- Детали ----------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

function SectionTitle({ icon, title, count }: { icon: React.ReactNode; title: string; count: number | null }) {
  return (
    <h3 className="flex items-center gap-2 text-[13px] font-medium text-muted">
      {icon}
      {title}
      {count ? <span className="rounded-full bg-surface px-1.5 text-[12px] text-muted">{count}</span> : null}
    </h3>
  );
}

// Подразделение с точкой цвета направления.
function Dot({ color, label, big = false }: { color: number | null; label: string; big?: boolean }) {
  const bg = color ? `var(--branch-${color}-bg)` : "var(--tandem-surface)";
  const dot = color ? `var(--branch-${color}-strong)` : "#a3a3a3";
  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-2 rounded-full font-medium text-ink ${big ? "h-8 pl-2.5 pr-3 text-[14px]" : "h-6 pl-2 pr-2.5 text-[12px]"}`}
      style={{ background: bg }}
    >
      <span className={`${big ? "h-2 w-2" : "h-1.5 w-1.5"} shrink-0 rounded-full`} style={{ background: dot }} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-fit items-center gap-2 rounded-full pl-1 pr-3 text-[14px] font-medium text-ink transition-colors hover:bg-surface"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-ink">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      {label}
    </button>
  );
}

function PickerBox({ title, onCancel, children }: { title: string; onCancel: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-2xl bg-surface p-3">
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

function Confirm({ text, yes, danger = false, pending, onYes, onNo }: { text: string; yes: string; danger?: boolean; pending: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <div className={`mt-1 flex flex-col gap-3 rounded-2xl p-4 ${danger ? "bg-red-50" : "bg-surface"}`}>
      <p className={`text-[14px] ${danger ? "text-red-900" : "text-ink"}`}>{text}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={onYes} className={`${btnPrimary} h-10! ${danger ? "bg-red-700! hover:bg-red-800!" : ""}`}>
          {pending ? t.company.saving : yes}
        </button>
        <button type="button" onClick={onNo} disabled={pending} className={`${btnSecondary} h-10! bg-white! hover:bg-neutral-100!`}>
          {t.company.cancel}
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
        className="h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
      />
      <button type="submit" disabled={pending} className={`${btnPrimary} h-10!`}>
        {c.save}
      </button>
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
        className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
      />
      <ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain rounded-xl border border-line bg-white p-1">
        {shown.length === 0 ? <li className="px-3 py-2.5 text-[14px] text-muted">{c.unitPickerNothing}</li> : null}
        {shown.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p.id)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-[14px] text-ink hover:bg-surface">
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
  const Icon = locked ? LockIcon : moduleKey === "chat" ? ChatPageIcon : TasksPageIcon;
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface text-ink" aria-hidden>
      <Icon className="h-4 w-4" />
    </span>
  );
}

// Иконки свойств — в стиле карточки задачи.
function Svg({ children, className = "h-[17px] w-[17px]" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {children}
    </svg>
  );
}
const ShieldIcon = () => (
  <Svg>
    <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3z" />
  </Svg>
);
const BadgeIcon = () => (
  <Svg>
    <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17" />
  </Svg>
);
const CalendarIcon = () => (
  <Svg>
    <rect x="4" y="5" width="16" height="15" rx="2.5" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Svg>
);
const StarIcon = () => (
  <Svg>
    <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
  </Svg>
);
const UnitIcon = () => (
  <Svg className="h-4 w-4">
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
    <path d="M6.5 10v4a2 2 0 0 0 2 2H14" />
  </Svg>
);
const PagesIcon = () => (
  <Svg className="h-4 w-4">
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
  </Svg>
);
const MoveIcon = () => (
  <Svg className="h-[18px] w-[18px]">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
const ArrowIcon = () => (
  <Svg className="h-3.5 w-3.5">
    <path d="M7 17 17 7M9 7h8v8" />
  </Svg>
);
const InfoIcon = () => (
  <Svg className="mt-0.5 h-3.5 w-3.5 shrink-0">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);
