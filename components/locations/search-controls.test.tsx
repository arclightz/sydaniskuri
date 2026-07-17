import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchControls } from "./search-controls";

describe("SearchControls", () => {
  it("disables controls while location summaries load", () => {
    render(
      <SearchControls
        loading
        filters={{ query: "", openNow: false, alwaysOpen: false, locationType: "" }}
        locationTypes={[]}
        onChange={() => {}}
        onClear={() => {}}
      />,
    );

    expect(screen.getByLabelText("Haku ja suodattimet")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("searchbox")).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Avoinna nyt" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Paikkatyyppi" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tyhjennä suodattimet" })).toBeDisabled();
  });

  it("updates search and filters and can clear them", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(
      <SearchControls
        filters={{ query: "", openNow: false, alwaysOpen: false, locationType: "" }}
        locationTypes={["Kirjasto"]}
        onChange={onChange}
        onClear={onClear}
      />,
    );

    await user.type(screen.getByRole("searchbox"), "Turku");
    await user.click(screen.getByRole("checkbox", { name: "Avoinna nyt" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Paikkatyyppi" }), "Kirjasto");
    await user.click(screen.getByRole("button", { name: "Tyhjennä suodattimet" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ query: "T" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ openNow: true }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ locationType: "Kirjasto" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
