import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { BackLink } from "@/components/auth/BackLink";

// Общая рамка экранов входа: компьютер — слайд-шоу слева и форма справа,
// телефон — только форма со стрелкой «назад» (без нижней навигации).
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthShell
      back={
        <Suspense fallback={<div className="h-11" />}>
          <BackLink />
        </Suspense>
      }
    >
      {children}
    </AuthShell>
  );
}
