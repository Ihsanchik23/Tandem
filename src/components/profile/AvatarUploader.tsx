"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { AVATAR_MAX_SOURCE_BYTES, AVATAR_TYPES, compressAvatar } from "@/lib/profile/image";
import { createClient } from "@/lib/supabase/client";
import { FormMessage } from "@/components/ui/FormMessage";
import { Avatar } from "./Avatar";

type Props = { userId: string; name: string; initialUrl: string | null };

// Загрузка фото сразу после выбора: в бакет avatars/<user_id>/..., затем адрес в profiles.avatar_url.
export function AvatarUploader({ userId, name, initialUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  async function removeOldFiles(keep?: string) {
    const supabase = createClient();
    const { data } = await supabase.storage.from("avatars").list(userId);
    const old = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
    if (old.length) await supabase.storage.from("avatars").remove(old);
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
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (upErr) throw upErr;

      const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      if (dbErr) throw dbErr;

      setUrl(publicUrl);
      await removeOldFiles(path);
      router.refresh();
    } catch {
      setError("avatarFailed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
      if (dbErr) throw dbErr;
      setUrl(null);
      await removeOldFiles();
      router.refresh();
    } catch {
      setError("avatarFailed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar url={url} name={name} size={96} alt={t.profile.avatarAlt} />
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TYPES.join(",")}
        className="sr-only"
        id="avatar-input"
        onChange={(e) => onFile(e.target.files?.[0])}
        disabled={busy}
      />
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <label
          htmlFor="avatar-input"
          className={`cursor-pointer text-base font-medium text-neutral-900 underline underline-offset-4 ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          {busy ? t.profileEdit.avatarUploading : url ? t.profileEdit.avatarChange : t.profileEdit.avatarUpload}
        </label>
        {url && !busy ? (
          <button type="button" onClick={onRemove} className="text-base text-neutral-600 underline underline-offset-4">
            {t.profileEdit.avatarRemove}
          </button>
        ) : null}
      </div>
      <p className="text-sm text-neutral-500">{t.profileEdit.avatarHint}</p>
      {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
    </div>
  );
}
