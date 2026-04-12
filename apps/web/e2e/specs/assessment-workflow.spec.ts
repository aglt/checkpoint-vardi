import { expect, test } from "@playwright/test";

const WOODWORKING_TEMPLATE_TITLE = "Vinnuumhverfisvísir fyrir Trésmíðaverkstæði";

test("partial MVP workflow stays truthfully blocked at export readiness", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Workplace name").fill("FB workshop E2E");
  await page.getByLabel("Address").fill("Austurberg 5");
  await page.getByLabel(WOODWORKING_TEMPLATE_TITLE).check();
  await page.getByRole("button", { name: "Create assessment" }).click();

  await page.waitForURL(/\/assessments\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "FB workshop E2E" }),
  ).toBeVisible();

  const firstCriterion = page.locator("[data-criterion-id]").first();
  await firstCriterion.getByRole("radio", { name: "Not ok" }).click();

  await expect(firstCriterion).toHaveAttribute("data-selected-answer", "notOk");

  const transferButton = page.getByRole("button", { name: "Transfer 1 finding" });
  await expect(transferButton).toBeEnabled({ timeout: 15_000 });
  await transferButton.click();

  await expect(
    page.getByText("Transferred 1 finding into the risk register."),
  ).toBeVisible();

  const riskEntry = page.locator("[data-risk-entry-id]").first();
  await expect(riskEntry).toBeVisible();

  await riskEntry.getByLabel("Hazard").fill("Missing guard on table saw");
  await riskEntry
    .locator('[data-score-label="Likelihood"][data-score-value="3"]')
    .click();
  await riskEntry
    .locator('[data-score-label="Consequence"][data-score-value="3"]')
    .click();
  await riskEntry.getByRole("button", { name: "Save risk entry" }).click();

  await expect(riskEntry).toHaveAttribute("data-classification-state", "ready");
  await expect(riskEntry).toHaveAttribute("data-risk-level", "high");
  await expect(riskEntry.getByText("Saved classification: High.")).toBeVisible();

  const summarySection = page.locator("[data-summary-readiness]").first();
  await summarySection.getByLabel("Participants").fill("Student assessor");
  await summarySection
    .getByLabel("Method")
    .fill("Walkthrough with seeded checklist and one transferred finding.");
  await summarySection
    .getByLabel("Summary notes")
    .fill("The table saw needs a guard before the workshop flow can be considered ready.");
  await summarySection.getByRole("button", { name: "Save summary" }).click();

  await expect(summarySection).toHaveAttribute("data-summary-readiness", "blocked");
  await expect(
    summarySection.getByText(
      "Summary saved. Remaining blockers are listed in the readiness panel.",
    ),
  ).toBeVisible();
  await expect(
    summarySection.getByText(
      "Finish the readiness blockers above before export unlocks.",
    ),
  ).toBeVisible();
  await expect(
    summarySection.getByRole("button", { name: "Download Word + PDF bundle" }),
  ).toBeDisabled();

  await expect(
    summarySection.locator('[data-readiness-label="Walkthrough"]'),
  ).toHaveAttribute("data-readiness-state", "blocked");
  await expect(
    summarySection.locator('[data-readiness-label="Transfer"]'),
  ).toHaveAttribute("data-readiness-state", "ready");
  await expect(
    summarySection.locator('[data-readiness-label="Classification"]'),
  ).toHaveAttribute("data-readiness-state", "ready");
  await expect(
    summarySection.locator('[data-readiness-label="Summary"]'),
  ).toHaveAttribute("data-readiness-state", "ready");
});
