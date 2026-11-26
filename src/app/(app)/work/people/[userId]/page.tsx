import { redirect } from "next/navigation";

// Старый адрес карточки сотрудника: теперь карточка открывается панелью поверх списка.
export default async function MemberPage({ params }: PageProps<"/work/people/[userId]">) {
  const { userId } = await params;
  redirect(`/work/people?member=${encodeURIComponent(userId)}`);
}
