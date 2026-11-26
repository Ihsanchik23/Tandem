import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RowsSkeleton } from "@/components/ui/Skeletons";

// Старый адрес карточки сотрудника: теперь карточка открывается панелью поверх списка.
// Адрес читаем внутри Suspense — так требует сборка с Cache Components.
export default function MemberPage({ params }: PageProps<"/work/people/[userId]">) {
  return (
    <Suspense fallback={<RowsSkeleton rows={6} />}>
      <ToPanel params={params} />
    </Suspense>
  );
}

async function ToPanel({ params }: { params: PageProps<"/work/people/[userId]">["params"] }) {
  const { userId } = await params;
  redirect(`/work/people?member=${encodeURIComponent(userId)}`);
  return null;
}
