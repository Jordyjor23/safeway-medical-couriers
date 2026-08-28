"use client";

import { useRouter } from "next/navigation";
import { recordLogout } from "@/app/(auth)/logout-action";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
      onClick={async () => {
        await recordLogout();
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
