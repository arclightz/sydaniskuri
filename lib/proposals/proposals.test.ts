import { describe, expect, it } from "vitest";
import { LocalProposalRepository, validateProposal } from "./proposals";
import type { ProposalInput } from "./types";

const validInput: ProposalInput = {
  name: "Kirjaston sydäniskuri",
  locationType: "Kirjasto",
  model: "",
  address: "Keskuskatu 1",
  postalCode: "00100",
  city: "Helsinki",
  latitude: 60.17,
  longitude: 24.94,
  addressDetails: "Infopisteen takana",
  availability: { type: "always" },
};

describe("proposal validation", () => {
  it("returns field-specific errors", () => {
    const errors = validateProposal({ ...validInput, name: "", postalCode: "100", latitude: 91 });

    expect(errors).toMatchObject({
      name: "Anna kohteen nimi.",
      postalCode: "Postinumeron tulee olla viisinumeroinen.",
      latitude: "Valitse sijainti kartalta.",
    });
  });

  it("requires days and valid times for custom availability", () => {
    const errors = validateProposal({
      ...validInput,
      availability: { type: "custom", days: [], from: "18:00", to: "08:00" },
    });

    expect(errors.availabilityDays).toBeTruthy();
    expect(errors.availabilityTime).toBeTruthy();
  });
});

describe("LocalProposalRepository", () => {
  it("stores pending proposals and only returns the owner's records", () => {
    const repository = new LocalProposalRepository(localStorage);
    const own = repository.create("user-1", validInput);
    repository.create("user-2", { ...validInput, name: "Toinen" });

    expect(own).toMatchObject({ ownerId: "user-1", status: "pending" });
    expect(repository.listByOwner("user-1")).toEqual([own]);
  });

  it("only allows the owner to delete a proposal", () => {
    const repository = new LocalProposalRepository(localStorage);
    const proposal = repository.create("user-1", validInput);

    expect(repository.remove("user-2", proposal.id)).toBe(false);
    expect(repository.remove("user-1", proposal.id)).toBe(true);
    expect(repository.listByOwner("user-1")).toEqual([]);
  });
});
