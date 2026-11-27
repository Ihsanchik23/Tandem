import { redirect } from "next/navigation";
import { Suspense } from "react";

// Старый адрес формы. Создание страницы теперь — панель справа (?new-page=1) поверх «Работы».
export default function NewPageRedirect({ searchParams }: PageProps<"/work/pages/new">) {
  return (
    <Suspense fallback={null}>
      <Redirect searchParams={searchParams} />
    </Suspense>
  );
}

async function Redirect({ searchParams }: { searchParams: PageProps<"/work/pages/new">["searchParams"] }): Promise<null> {
  const { unit, scope, from } = await searchParams;
  const params = new URLSearchParams({ "new-page": "1" });
  if (typeof unit === "string") params.set("unit", unit);
  else if (scope === "organization") params.set("scope", "organization");
  redirect(`${from === "canvas" ? "/work/structure" : "/work"}?${params.toString()}`);
  return null;
}
