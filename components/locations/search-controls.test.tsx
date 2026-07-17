import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchControls } from "./search-controls";

describe("SearchControls", () => {
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
