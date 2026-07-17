import type { Proposal, ProposalInput } from "./types";

const PROPOSALS_KEY = "sydaniskuri.proposals";

export type ProposalErrors = Partial<Record<
  "name" | "locationType" | "address" | "postalCode" | "city" | "latitude" | "longitude" | "addressDetails" | "availabilityDays" | "availabilityTime",
  string
>>;

export function validateProposal(input: ProposalInput): ProposalErrors {
  const errors: ProposalErrors = {};
  if (!input.name.trim()) errors.name = "Anna kohteen nimi.";
  if (!input.locationType.trim()) errors.locationType = "Valitse paikkatyyppi.";
  if (!input.address.trim()) errors.address = "Anna katuosoite.";
  if (!/^\d{5}$/.test(input.postalCode)) errors.postalCode = "Postinumeron tulee olla viisinumeroinen.";
  if (!input.city.trim()) errors.city = "Anna kaupunki.";
  if (input.latitude === null || !Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    errors.latitude = "Valitse sijainti kartalta.";
  }
  if (input.longitude === null || !Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    errors.longitude = "Valitse sijainti kartalta.";
  }
  if (!input.addressDetails.trim()) errors.addressDetails = "Kerro, mistä laite löytyy rakennuksessa.";
  if (input.availability.type === "custom") {
    if (!input.availability.days.length) errors.availabilityDays = "Valitse vähintään yksi viikonpäivä.";
    if (!input.availability.from || !input.availability.to || input.availability.from >= input.availability.to) {
      errors.availabilityTime = "Anna alkuaikaa myöhäisempi päättymisaika.";
    }
  }
  return errors;
}

export interface ProposalRepository {
  create(ownerId: string, input: ProposalInput): Proposal;
  listByOwner(ownerId: string): Proposal[];
  remove(ownerId: string, proposalId: string): boolean;
  reset(): void;
}

export class LocalProposalRepository implements ProposalRepository {
  constructor(private readonly storage: Storage) {}

  private read(): Proposal[] {
    const value = this.storage.getItem(PROPOSALS_KEY);
    if (!value) return [];
    try {
      const proposals: unknown = JSON.parse(value);
      if (!Array.isArray(proposals)) throw new Error();
      return proposals as Proposal[];
    } catch {
      throw new Error("Paikalliset ehdotustiedot ovat vioittuneet.");
    }
  }

  private write(proposals: Proposal[]) {
    this.storage.setItem(PROPOSALS_KEY, JSON.stringify(proposals));
  }

  create(ownerId: string, input: ProposalInput): Proposal {
    const errors = validateProposal(input);
    if (Object.keys(errors).length) throw new Error("Tarkista lomakkeen tiedot.");
    const proposal: Proposal = {
      ...input,
      name: input.name.trim(),
      address: input.address.trim(),
      postalCode: input.postalCode.trim(),
      city: input.city.trim(),
      addressDetails: input.addressDetails.trim(),
      id: crypto.randomUUID(),
      ownerId,
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    this.write([...this.read(), proposal]);
    return proposal;
  }

  listByOwner(ownerId: string): Proposal[] {
    return this.read()
      .filter((proposal) => proposal.ownerId === ownerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  remove(ownerId: string, proposalId: string): boolean {
    const proposals = this.read();
    const next = proposals.filter((proposal) => !(proposal.id === proposalId && proposal.ownerId === ownerId));
    if (next.length === proposals.length) return false;
    this.write(next);
    return true;
  }

  reset() {
    this.storage.removeItem(PROPOSALS_KEY);
  }
}
