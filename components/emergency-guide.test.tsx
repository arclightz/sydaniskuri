import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EmergencyGuide } from "./emergency-guide";

describe("EmergencyGuide", () => {
  it("opens and closes the quick emergency instructions", async () => {
    const user = userEvent.setup();
    render(<EmergencyGuide />);

    await user.click(screen.getByRole("button", { name: /hätäohje/i }));
    expect(screen.getByRole("dialog", { name: "Toimi näin hätätilanteessa" })).toBeInTheDocument();
    expect(screen.getByText(/soita 112/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sulje hätäohje" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
