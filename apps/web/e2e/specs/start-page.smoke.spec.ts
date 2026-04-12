import { expect, test } from "@playwright/test";

const WOODWORKING_TEMPLATE_TITLE = "Vinnuumhverfisvísir fyrir Trésmíðaverkstæði";
const CONSTRUCTION_TEMPLATE_TITLE = "Vinnuumhverfisvísir fyrir byggingarsvæði";

test("start page boots with the seeded template choices", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Start a seeded assessment and leave the walkthrough for the next step.",
    }),
  ).toBeVisible();
  await expect(page.getByText(WOODWORKING_TEMPLATE_TITLE)).toBeVisible();
  await expect(page.getByText(CONSTRUCTION_TEMPLATE_TITLE)).toBeVisible();
  await expect(page.getByRole("button", { name: "Create assessment" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});
