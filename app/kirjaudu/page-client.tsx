"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AUTH_EVENT } from "@/components/site-header";
import { LocalAuthRepository } from "@/lib/auth/local-auth";
import { getLocalStorage } from "@/lib/storage";

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repository = useMemo(() => new LocalAuthRepository(getLocalStorage()), []);
  return <AuthPanel repository={repository} onAuthenticated={() => { window.dispatchEvent(new Event(AUTH_EVENT)); router.push(searchParams.get("next") || "/lisaa"); }} />;
}
