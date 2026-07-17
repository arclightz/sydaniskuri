"use client";

import { useMemo } from "react";
import { ProtectedContent } from "@/components/auth/protected-content";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { LocalAuthRepository } from "@/lib/auth/local-auth";
import { LocalProposalRepository } from "@/lib/proposals/proposals";
import { getLocalStorage } from "@/lib/storage";

export function AddProposalClient() {
  const storage = getLocalStorage();
  const auth = useMemo(() => new LocalAuthRepository(storage), [storage]);
  const proposals = useMemo(() => new LocalProposalRepository(storage), [storage]);
  return <ProtectedContent repository={auth}>{(user) => <ProposalForm ownerId={user.id} repository={proposals} />}</ProtectedContent>;
}
