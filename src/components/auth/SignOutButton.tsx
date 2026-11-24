import { signOut } from "@/lib/auth/actions";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary">
        {t.auth.signOut}
      </Button>
    </form>
  );
}
