// Ссылка-приглашение: адрес и срок действия.
export type InviteRow = { id: string; token: string; expires_at: string; revoked_at: string | null };

export function invitePath(token: string): string {
  return `/invite/${encodeURIComponent(token)}`;
}

export function isInviteActive(i: Pick<InviteRow, "expires_at" | "revoked_at">, now: Date = new Date()): boolean {
  return i.revoked_at === null && new Date(i.expires_at).getTime() > now.getTime();
}
