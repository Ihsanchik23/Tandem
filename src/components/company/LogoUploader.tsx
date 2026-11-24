"use client";

import { t } from "@/lib/i18n";
import { ImageUploader } from "@/components/ui/ImageUploader";

type Props = { organizationId: string; name: string; initialUrl: string | null };

// Логотип компании: logos/<organization_id>/... → organizations.logo_url (Owner/Admin).
export function LogoUploader({ organizationId, name, initialUrl }: Props) {
  const c = t.company;
  return (
    <ImageUploader
      kind="logo"
      ownerId={organizationId}
      name={name}
      initialUrl={initialUrl}
      labels={{
        alt: c.logoAlt,
        upload: c.logoUpload,
        change: c.logoChange,
        remove: c.logoRemove,
        uploading: c.logoUploading,
        failed: "logoFailed",
      }}
    />
  );
}
