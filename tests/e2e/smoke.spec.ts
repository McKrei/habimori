import { expect, test } from "@playwright/test";

test("shows login gate on home page", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /login with google/i }),
  ).toBeVisible();
});
