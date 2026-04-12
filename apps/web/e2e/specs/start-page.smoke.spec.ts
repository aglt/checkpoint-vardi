import { expect, test } from "@playwright/test";

const WOODWORKING_TEMPLATE_TITLE = "Vinnuumhverfisvísir fyrir Trésmíðaverkstæði";
const CONSTRUCTION_TEMPLATE_TITLE = "Vinnuumhverfisvísir fyrir byggingarsvæði";

test.use({ locale: "is-IS" });

test("start page boots with the seeded template choices", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "is");
  await expect(
    page.getByRole("heading", {
      name: "Hefja staðlað áhættumat og taka yfirferðina í næsta skrefi.",
    }),
  ).toBeVisible();
  await expect(page.getByText(WOODWORKING_TEMPLATE_TITLE)).toBeVisible();
  await expect(page.getByText(CONSTRUCTION_TEMPLATE_TITLE)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Búa til áhættumat" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.locator("body")).not.toContainText("Current MVP Start Entry");
  await expect(page.locator("body")).not.toContainText("Start assessment");
  await expect(page.locator("body")).not.toContainText("Workplace name");
  await expect(page.locator("body")).not.toContainText("Create assessment");
});
