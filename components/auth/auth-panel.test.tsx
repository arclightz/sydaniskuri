import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocalAuthRepository } from "@/lib/auth/local-auth";
import { AuthPanel } from "./auth-panel";

describe("AuthPanel", () => {
  it("shows registration errors beside the form", async () => {
    const user = userEvent.setup();
    render(<AuthPanel repository={new LocalAuthRepository(localStorage)} />);

    await user.click(screen.getByRole("button", { name: "Rekisteröidy" }));
    await user.click(screen.getByRole("button", { name: "Luo paikallinen tili" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Anna nimesi");
  });

  it("starts a demo session immediately", async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    render(<AuthPanel repository={new LocalAuthRepository(localStorage)} onAuthenticated={onAuthenticated} />);

    await user.click(screen.getByRole("button", { name: /jatka demokäyttäjänä/i }));

    expect(onAuthenticated).toHaveBeenCalledWith(expect.objectContaining({ isDemo: true }));
  });

  it("offers to reset corrupted local demo data", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sydaniskuri.users", "not-json");
    render(<AuthPanel repository={new LocalAuthRepository(localStorage)} />);

    await user.click(screen.getAllByRole("button", { name: "Kirjaudu" })[1]);

    expect(screen.getByRole("button", { name: "Nollaa demotiedot" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nollaa demotiedot" }));
    expect(localStorage.getItem("sydaniskuri.users")).toBeNull();
  });
});
