import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("etusivun haku, kohteen valinta ja hätäohje", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/12[\s\u00a0]486 kohdetta/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("searchbox").fill("Forcitintie 37");
  const locationCard = page.locator(".location-card").filter({ hasText: "10900" }).first();
  await expect(locationCard.getByRole("heading", { name: "Oy Forcit Ab Hangon konttori", exact: true })).toBeVisible();
  await locationCard.getByRole("heading", { name: "Oy Forcit Ab Hangon konttori", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Oy Forcit Ab Hangon konttori" })).toBeVisible();
  await expect(page.getByText("Tarkka sijainti")).toBeVisible();
  await expect(page.getByRole("link", { name: /Näytä reitti/ })).toHaveAttribute("href", /destination=/);
  await page.getByRole("button", { name: "Sulje kohdetiedot" }).click();

  await page.getByRole("button", { name: /Hätäohje/ }).click();
  await expect(page.getByRole("dialog", { name: "Toimi näin hätätilanteessa" })).toBeVisible();
  await page.getByRole("link", { name: "Avaa laajemmat ohjeet" }).click();
  await expect(page).toHaveURL(/\/ohjeet$/);
  await expect(page.getByRole("heading", { name: "Elvytys- ja sydäniskuriohjeet" })).toBeVisible();
});

test("left pane limits results and stays within the map viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/kohdetta kartta-alueella/)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".location-card")).toHaveCount(5);
  const dimensions = await page.evaluate(() => {
    const explorer = document.querySelector(".explorer")?.getBoundingClientRect();
    const map = document.querySelector(".map-area")?.getBoundingClientRect();
    return { explorerHeight: explorer?.height, mapHeight: map?.height };
  });
  expect(dimensions.mapHeight).toBe(dimensions.explorerHeight);
});

test("vector basemap renders before location data", async ({ page }) => {
  const detailRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/data/details/")) detailRequests.push(request.url());
  });
  const pointsResponse = page.waitForResponse("**/data/map-points.geojson");
  const indexResponse = page.waitForResponse("**/data/location-index.json");
  await page.route("**/data/map-points.geojson", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.route("**/data/location-index.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });

  await page.goto("/");
  expect((await pointsResponse).status()).toBe(200);
  expect((await indexResponse).status()).toBe(200);
  await expect(page.getByLabel("Interaktiivinen sydäniskurikartta")).toBeVisible();
  await expect(page.getByText("Kohteita ladataan…")).toBeVisible();
  await expect(page.getByText(/12[\s\u00a0]486 kohdetta/)).toBeVisible({ timeout: 10_000 });
  expect(detailRequests).toHaveLength(0);

  await page.getByRole("searchbox").fill("Forcitintie 37");
  await page.locator(".location-card").first().getByRole("heading").click();
  await expect.poll(() => detailRequests.length).toBe(1);
});

test("demokäyttäjä tallentaa ehdotuksen, näkee sen ja kirjautuu ulos", async ({ page }) => {
  await page.goto("/kirjaudu");
  await page.getByRole("button", { name: /Jatka demokäyttäjänä/ }).click();
  await expect(page).toHaveURL(/\/lisaa$/);

  await page.getByRole("button", { name: "Lähetä ehdotus" }).click();
  await expect(page.getByText("Tarkista merkityt kentät ja yritä uudelleen.", { exact: true })).toBeVisible();

  await page.getByRole("textbox", { name: /Kohteen nimi/ }).fill("Testikirjaston sydäniskuri");
  await page.getByRole("combobox", { name: /Paikkatyyppi/ }).selectOption("Kirjasto");
  await page.getByRole("textbox", { name: /Katuosoite/ }).fill("Testikatu 1");
  await page.getByRole("textbox", { name: /Postinumero/ }).fill("00100");
  await page.getByRole("textbox", { name: /Kaupunki/ }).fill("Helsinki");
  await page.getByRole("spinbutton", { name: "Leveysaste" }).fill("60.17");
  await page.getByRole("spinbutton", { name: "Pituusaste" }).fill("24.94");
  await page.getByRole("textbox", { name: /Tarkka sijaintiohje/ }).fill("Pääoven vieressä infopisteellä");
  await page.getByRole("button", { name: "Lähetä ehdotus" }).click();

  await expect(page.getByRole("heading", { name: "Kiitos ehdotuksestasi" })).toBeVisible();
  await page.getByRole("link", { name: "Näytä omat ehdotukset" }).click();
  await expect(page.getByRole("heading", { name: "Testikirjaston sydäniskuri" })).toBeVisible();
  await expect(page.getByText("Odottaa tarkistusta")).toBeVisible();

  const mobileMenu = page.getByRole("button", { name: "Avaa valikko" });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
  await page.goto("/lisaa");
  await expect(page).toHaveURL(/\/kirjaudu\?next=%2Flisaa$/);
});

test("sivuilla ei ole vaakasuuntaista vieritystä", async ({ page }, testInfo) => {
  const widths = testInfo.project.name === "chromium" ? [375, 768, 1024, 1440] : [375];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/ohjeet", "/kirjaudu"]) {
      await page.goto(path);
      const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(dimensions.scrollWidth, `${path} leveyden ${width}px näkymässä`).toBeLessThanOrEqual(dimensions.clientWidth);
    }
  }
});
