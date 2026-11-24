"use client";

import { t } from "@/lib/i18n";
import { ImageUploader } from "@/components/ui/ImageUploader";

type Props = { userId: string; name: string; initialUrl: string | null };

// Фото профиля: загрузка сразу после выбора (avatars/<user_id>/... → profiles.avatar_url).
export function AvatarUploader({ userId, name, initialUrl }: Props) {
  const e = t.profileEdit;
  return (
    <ImageUploader
      kind="avatar"
      ownerId={userId}
      name={name}
      initialUrl={initialUrl}
      labels={{
        alt: t.profile.avatarAlt,
        upload: e.avatarUpload,
        change: e.avatarChange,
        remove: e.avatarRemove,
        uploading: e.avatarUploading,
        failed: "avatarFailed",
      }}
    />
  );
}
