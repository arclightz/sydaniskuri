import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocalProposalRepository } from "@/lib/proposals/proposals";
import { ProposalForm } from "./proposal-form";

vi.mock("./coordinate-picker", () => ({ CoordinatePicker: () => <div>Testikarttavalitsin</div> }));

describe("ProposalForm", () => {
  it("shows all sections and associates errors with fields", async () => {
    const user = userEvent.setup();
    render(<ProposalForm ownerId="user-1" repository={new LocalProposalRepository(localStorage)} />);

    expect(screen.getByRole("heading", { name: "Perustiedot" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Osoite ja sijainti" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Löydettävyys" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Saatavuus" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lähetä ehdotus" }));

    const name = screen.getByRole("textbox", { name: /kohteen nimi/i });
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Anna kohteen nimi.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Tarkista merkityt kentät");
  });
});
