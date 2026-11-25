"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { revalidateAfterImageChange } from "@/lib/cache/actions";
import { t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { AVATAR_MAX_SOURCE_BYTES, AVATAR_TYPES, compressAvatar } from "@/lib/profile/image";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/profile/Avatar";
import { FormMessage } from "@/components/ui/FormMessage";

// Что загружаем: фото профиля или логотип компании.
//  avatar: бакет avatars/<user_id>/...,        адрес → profiles.avatar_url (своя строка)
//  logo:   бакет logos/<organization_id>/...,  адрес → organizations.logo_url (Owner/Admin)
// Права проверяют политики хранилища и RLS таблиц.
const KINDS = {
  avatar: { bucket: "avatars", prefix: "avatar" },
  logo: { bucket: "logos", prefix: "logo" },
} as const;

type Labels = { alt: string; upload: string; change: string; remove: string; uploading: string; failed: ErrorKey };

type Props = {
  kind: keyof typeof KINDS;
  ownerId: string; // id пользователя или компании — это и папка в хранилище, и строка в таблице
  name: string;
  initialUrl: string | null;
  labels: Labels;
};

export function ImageUploader({ kind, ownerId, name, initialUrl, labels }: Props) {
  const cfg = KINDS[kind];
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const inputId = `${kind}-input`;

  async function saveUrl(value: string | null) {
    const supabase = createClient();
    const { data, error: dbErr } =
      kind === "avatar"
        ? await supabase.from("profiles").update({ avatar_url: value }).eq("id", ownerId).select("id")
        : await supabase.from("organizations").update({ logo_url: value }).eq("id", ownerId).select("id");
    if (dbErr) throw dbErr;
    if (!data || data.length === 0) throw new Error("forbidden"); // RLS не пустил
  }

  async function removeOldFiles(keep?: string) {
    const supabase = createClient();
    const { data } = await supabase.storage.from(cfg.bucket).list(ownerId);
    const old = (data ?? []).map((f) => `${ownerId}/${f.name}`).filter((p) => p !== keep);
    if (old.length) await supabase.storage.from(cfg.bucket).remove(old);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!AVATAR_TYPES.includes(file.type)) return setError("avatarType");
    if (file.size > AVATAR_MAX_SOURCE_BYTES) return setError("avatarTooBig");

    setBusy(true);
    try {
      const blob = await compressAvatar(file);
      const supabase = createClient();
      const path = `${ownerId}/${cfg.prefix}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(cfg.bucket)
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (upErr) throw upErr;

      const publicUrl = supabase.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl;
      await saveUrl(publicUrl);
      setUrl(publicUrl);
      await removeOldFiles(path);
      // Сбросить кэш страниц, где видна картинка (панель, списки, профили), и обновить текущую.
      await revalidateAfterImageChange();
      router.refresh();
    } catch {
      setError(labels.failed);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setError(null);
    setBusy(true);
    try {
      await saveUrl(null);
      setUrl(null);
      await removeOldFiles();
      // Сбросить кэш страниц, где видна картинка (панель, списки, профили), и обновить текущую.
      await revalidateAfterImageChange();
      router.refresh();
    } catch {
      setError(labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar url={url} name={name} size={96} alt={labels.alt} />
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TYPES.join(",")}
        className="sr-only"
        id={inputId}
        onChange={(e) => onFile(e.target.files?.[0])}
        disabled={busy}
      />
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <label
          htmlFor={inputId}
          className={`cursor-pointer text-base font-medium text-accent underline underline-offset-4 ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          {busy ? labels.uploading : url ? labels.change : labels.upload}
        </label>
        {url && !busy ? (
          <button type="button" onClick={onRemove} className="text-base text-ink underline underline-offset-4">
            {labels.remove}
          </button>
        ) : null}
      </div>
      <p className="text-sm text-ink">{t.profileEdit.avatarHint}</p>
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
    </div>
  );
}
