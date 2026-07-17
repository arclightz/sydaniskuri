import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "@/lib/auth/local-auth";
import { ProtectedContent } from "./protected-content";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/lisaa",
}));

const repository: AuthRepository = {
  register: vi.fn(), login: vi.fn(), loginAsDemo: vi.fn(), logout: vi.fn(), reset: vi.fn(),
  getSessionUser: vi.fn().mockResolvedValue(null),
};

describe("ProtectedContent", () => {
  it("redirects signed-out visitors to login with a return path", async () => {
    render(<ProtectedContent repository={repository}>{() => <p>Suojattu</p>}</ProtectedContent>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/kirjaudu?next=%2Flisaa"));
  });
});
