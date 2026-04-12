import { expect, test } from "@playwright/test";

const WOODWORKING_TEMPLATE_TITLE = "Vinnuumhverfisvísir fyrir Trésmíðaverkstæði";

test.use({ locale: "is-IS" });

test("partial MVP workflow stays truthfully blocked at export readiness", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "is");
  await page.locator("#workplaceName").fill("FB workshop E2E");
  await page.locator("#workplaceAddress").fill("Austurberg 5");
  await page.getByLabel(WOODWORKING_TEMPLATE_TITLE).check();
  await page.locator('[data-start-assessment-submit="true"]').click();

  await page.waitForURL(/\/assessments\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "FB workshop E2E" }),
  ).toBeVisible();

  const firstCriterion = page.locator("[data-criterion-id]").first();
  await firstCriterion.locator('[data-answer-value="notOk"]').click();

  await expect(firstCriterion).toHaveAttribute("data-selected-answer", "notOk");

  const transferButton = page.locator('[data-transfer-action="risk-register"]');
  await expect(transferButton).toBeEnabled({ timeout: 15_000 });
  await transferButton.click();

  await expect(
    page.getByText("Færði 1 niðurstöðu í áhættuskrána."),
  ).toBeVisible();

  const riskEntry = page.locator("[data-risk-entry-id]").first();
  await expect(riskEntry).toBeVisible();

  await riskEntry
    .locator('[data-field="hazard"]')
    .fill("Missing guard on table saw");
  await riskEntry
    .locator('[data-score-kind="likelihood"][data-score-value="3"]')
    .click();
  await riskEntry
    .locator('[data-score-kind="consequence"][data-score-value="3"]')
    .click();
  await riskEntry.locator('[data-risk-entry-save-button="true"]').click();

  await expect(riskEntry).toHaveAttribute("data-classification-state", "ready");
  await expect(riskEntry).toHaveAttribute("data-risk-level", "high");
  await expect(riskEntry.getByText("Vistuð flokkun: Há.")).toBeVisible();

  const summarySection = page.locator("[data-summary-readiness]").first();
  await summarySection
    .locator('[data-summary-field="participants"]')
    .fill("Student assessor");
  await summarySection
    .locator('[data-summary-field="method"]')
    .fill("Walkthrough with seeded checklist and one transferred finding.");
  await summarySection
    .locator('[data-summary-field="notes"]')
    .fill("The table saw needs a guard before the workshop flow can be considered ready.");
  await summarySection.locator("[data-summary-save-state]").click();

  await expect(summarySection).toHaveAttribute("data-summary-readiness", "blocked");
  await expect(
    summarySection.getByText(
      "Samantekt vistuð. Eftirstöðvar hindranir eru taldar upp í stöðupanelnum.",
    ),
  ).toBeVisible();
  await expect(
    summarySection.getByText(
      "Ljúktu fyrst við hindranirnar hér að ofan áður en útflutningur opnast.",
    ),
  ).toBeVisible();
  await expect(
    summarySection.locator("[data-export-button-state]"),
  ).toBeDisabled();

  await expect(
    summarySection.locator('[data-readiness-key="walkthrough"]'),
  ).toHaveAttribute("data-readiness-state", "blocked");
  await expect(
    summarySection.locator('[data-readiness-key="transfer"]'),
  ).toHaveAttribute("data-readiness-state", "ready");
  await expect(
    summarySection.locator('[data-readiness-key="classification"]'),
  ).toHaveAttribute("data-readiness-state", "ready");
  await expect(
    summarySection.locator('[data-readiness-key="summary"]'),
  ).toHaveAttribute("data-readiness-state", "ready");

  await expect(page.locator("body")).not.toContainText("Assessment Workflow");
  await expect(page.locator("body")).not.toContainText("Transfer to risk register");
  await expect(page.locator("body")).not.toContainText("Risk register");
  await expect(page.locator("body")).not.toContainText("Save risk entry");
  await expect(page.locator("body")).not.toContainText("Save summary");
  await expect(page.locator("body")).not.toContainText("Summary and export readiness");
  await expect(page.locator("body")).not.toContainText("Download Word + PDF bundle");
});
