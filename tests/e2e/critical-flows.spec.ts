import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/docs", "/templates", "/roadmap", "/changelog", "/updates"];

for (const route of publicRoutes) {
  test(`${route} renders without deprecated contract or server error`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).not.toContainText("This page couldn't load");
    await expect(page.locator("body")).not.toContainText("Contract Address");
  });
}

test("mobile public pages do not overflow horizontally", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  for (const route of ["/", "/templates", "/docs"]) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
  }
});

test("private dashboard requires wallet authentication", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/$/);
});

test("mutating APIs reject unauthenticated requests", async ({ request }) => {
  const headers = { origin: "http://127.0.0.1:3000", "content-type": "application/json" };
  const createAgent = await request.post("/api/agents", {
    headers,
    data: { templateId: "dip-buyer", parameters: {} },
  });
  expect(createAgent.status()).toBe(401);

  const link = await request.post("/api/link/generate", { headers, data: { chain: "base" } });
  expect(link.status()).toBe(401);

  const confirm = await request.post("/api/proposals/prop_test/confirm", {
    headers,
    data: { txHash: `0x${"1".repeat(64)}` },
  });
  expect(confirm.status()).toBe(401);
});

test("mutating APIs reject foreign origins before auth", async ({ request }) => {
  const response = await request.post("/api/agents", {
    headers: { origin: "https://evil.example", "content-type": "application/json" },
    data: { templateId: "dip-buyer", parameters: {} },
  });
  expect(response.status()).toBe(403);
});
