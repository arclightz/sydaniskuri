import { describe, expect, it } from "vitest";
import { LocalAuthRepository } from "./local-auth";

describe("LocalAuthRepository", () => {
  it("registers with normalized email and never stores the plain password", async () => {
    const auth = new LocalAuthRepository(localStorage);

    const user = await auth.register({ name: "  Maija  ", email: " MAIJA@Example.com ", password: "turvallinen12" });

    expect(user).toMatchObject({ name: "Maija", email: "maija@example.com" });
    expect(localStorage.getItem("sydaniskuri.users")).not.toContain("turvallinen12");
    expect(await auth.getSessionUser()).toMatchObject({ id: user.id });
  });

  it("logs in an existing user and logout only removes the session", async () => {
    const auth = new LocalAuthRepository(localStorage);
    const registered = await auth.register({ name: "Matti", email: "matti@example.com", password: "salasana123" });
    await auth.logout();

    expect(await auth.getSessionUser()).toBeNull();
    expect(await auth.login(" MATTI@example.com ", "salasana123")).toMatchObject({ id: registered.id });
    await auth.logout();
    expect(localStorage.getItem("sydaniskuri.users")).toContain("matti@example.com");
  });

  it("starts a ready-made demo session", async () => {
    const auth = new LocalAuthRepository(localStorage);
    const user = await auth.loginAsDemo();

    expect(user).toMatchObject({ name: "Demokäyttäjä", email: "demo@sydaniskuri.local", isDemo: true });
  });

  it("rejects duplicate accounts and incorrect passwords", async () => {
    const auth = new LocalAuthRepository(localStorage);
    await auth.register({ name: "Aino", email: "aino@example.com", password: "salasana123" });

    await expect(auth.register({ name: "Toinen", email: "AINO@example.com", password: "toinensalasana" })).rejects.toThrow("Sähköpostilla on jo tili");
    await expect(auth.login("aino@example.com", "vääräsalasana")).rejects.toThrow("Sähköposti tai salasana on väärä");
  });
});
