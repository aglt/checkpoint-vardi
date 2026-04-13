import { execFileSync } from "node:child_process";

import { expect, test } from "@playwright/test";

const WOODWORKING_TEMPLATE_TITLE = "Vinnuumhverfisvísir fyrir Trésmíðaverkstæði";
const CONSTRUCTION_TEMPLATE_TITLE = "Vinnuumhverfisvísir fyrir byggingarsvæði";

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
  for (const expectedLabel of [
    "Framvinda",
    "Athugasemdir yfirferðar",
    "Færa í áhættuskrá",
    "Áhættuskrá",
    "Samantekt og útflutningsstaða",
  ]) {
    await expect(page.locator("body")).toContainText(expectedLabel);
  }

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
  await expect(page.locator("body")).toContainText("Mótvægisaðgerðir");
  await expect(page.locator("body")).toContainText(
    "Engar vistaðar mótvægisaðgerðir enn.",
  );
  await expect(page.locator("body")).toContainText("Bæta við aðgerð");
  await expect(page.locator("body")).toContainText("Alvarleikaval");

  await riskEntry
    .locator('[data-field="hazard"]')
    .fill("Missing guard on table saw");
  await riskEntry
    .locator(
      '[data-severity-option="true"][data-severity-level="high"][data-likelihood="3"][data-consequence="3"]',
    )
    .click();
  await riskEntry.locator('[data-risk-entry-save-button="true"]').click();

  await expect(riskEntry).toHaveAttribute("data-classification-state", "ready");
  await expect(riskEntry).toHaveAttribute("data-risk-level", "high");
  await expect(riskEntry.getByText("Vistaður alvarleiki: Há.")).toBeVisible();
  await expect(page.locator("body")).toContainText("Vista áhættufærslu");

  const summarySection = page.locator("[data-summary-readiness]").first();
  await expect(
    summarySection.locator('[data-risk-level="high"]').getByText("Há"),
  ).toBeVisible();
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
  await expect(page.locator("body")).toContainText("Vista samantekt");
  await expect(page.locator("body")).toContainText("Sækja Word + PDF pakka");

  await expect(page.locator("body")).not.toContainText("Assessment Workflow");
  await expect(page.locator("body")).not.toContainText("Transfer to risk register");
  await expect(page.locator("body")).not.toContainText("Risk register");
  await expect(page.locator("body")).not.toContainText("Save risk entry");
  await expect(page.locator("body")).not.toContainText("Save summary");
  await expect(page.locator("body")).not.toContainText("Summary and export readiness");
  await expect(page.locator("body")).not.toContainText("Download Word + PDF bundle");
  await expect(page.locator("body")).not.toContainText("Mitigation actions");
  await expect(page.locator("body")).not.toContainText("Add action");
  await expect(page.locator("body")).not.toContainText(
    "No saved mitigation actions yet",
  );
});

test("construction workflow rules keep export blocked until saved reasoning and mitigation exist", async ({
  page,
}) => {
  await page.goto("/");

  await page.locator("#workplaceName").fill("Construction site E2E");
  await page.locator("#workplaceAddress").fill("Austurberg 17");
  await page.getByLabel(CONSTRUCTION_TEMPLATE_TITLE).check();
  await page.locator('[data-start-assessment-submit="true"]').click();

  await page.waitForURL(/\/assessments\/[0-9a-f-]+$/);
  const assessmentId = page.url().match(/\/assessments\/([0-9a-f-]+)$/)?.[1];

  if (!assessmentId) {
    throw new Error("Expected assessment URL to contain an id.");
  }

  seedCompletedConstructionWalkthrough(assessmentId);
  await page.reload();

  const transferButton = page.locator('[data-transfer-action="risk-register"]');
  await expect(transferButton).toBeEnabled({ timeout: 15_000 });
  await transferButton.click();

  const riskEntry = page.locator("[data-risk-entry-id]").first();
  await expect(riskEntry).toBeVisible();

  await riskEntry
    .locator('[data-field="hazard"]')
    .fill("Open trench edge without a temporary barrier");
  await riskEntry
    .locator(
      '[data-severity-option="true"][data-severity-level="high"][data-likelihood="3"][data-consequence="3"]',
    )
    .click();
  await riskEntry.locator('[data-risk-entry-save-button="true"]').click();

  await expect(riskEntry).toHaveAttribute("data-classification-state", "ready");
  await expect(riskEntry).toHaveAttribute("data-risk-level", "high");
  await expect(page.locator("body")).toContainText(
    "Þetta snið krefst vistaðrar röksemdar fyrir þessari flokkun áður en áhættuskráin og útflutningur teljast tilbúin.",
  );
  await expect(page.locator("body")).toContainText(
    "Þetta snið krefst að minnsta kosti einnar vistaðrar mótvægisaðgerðar fyrir þetta áhættustig áður en áhættuskráin og útflutningur teljast tilbúin.",
  );

  const summarySection = page.locator("[data-summary-readiness]").first();
  await summarySection
    .locator('[data-summary-field="participants"]')
    .fill("Student assessor");
  await summarySection
    .locator('[data-summary-field="method"]')
    .fill("Walkthrough with a transferred construction finding.");
  await summarySection
    .locator('[data-summary-field="notes"]')
    .fill("The trench edge needs both saved reasoning and a saved mitigation action before export.");
  await summarySection.locator("[data-summary-save-state]").click();

  await expect(summarySection).toHaveAttribute("data-summary-readiness", "blocked");
  await expect(
    summarySection.locator("[data-export-button-state]"),
  ).toBeDisabled();
  await expect(page.locator("body")).toContainText(
    "Vistaða röksemd vantar fyrir 1 áhættufærslu.",
  );
  await expect(page.locator("body")).toContainText(
    "Vistaða mótvægisaðgerð vantar fyrir 1 áhættufærslu.",
  );

  await riskEntry
    .locator('[id^="classification-reasoning-"]')
    .fill("Workers move along this edge often and an unprotected fall could cause severe injury.");
  await riskEntry.locator('[data-risk-entry-save-button="true"]').click();

  await expect(page.locator("body")).not.toContainText(
    "Vistaða röksemd vantar fyrir 1 áhættufærslu.",
  );
  await expect(page.locator("body")).toContainText(
    "Vistaða mótvægisaðgerð vantar fyrir 1 áhættufærslu.",
  );
  await expect(
    summarySection.locator("[data-export-button-state]"),
  ).toBeDisabled();

  await riskEntry.getByRole("button", { name: "Bæta við aðgerð" }).click();
  const mitigationDraft = riskEntry
    .locator('[data-mitigation-action-origin="draft"]')
    .first();
  await mitigationDraft
    .locator('textarea[id^="mitigation-description-"]')
    .fill("Install a temporary barrier before work resumes.");
  await mitigationDraft.getByRole("button", { name: "Búa til aðgerð" }).click();

  await expect(
    riskEntry.locator('[data-mitigation-action-origin="saved"]').first(),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    "Vistaða mótvægisaðgerð vantar fyrir 1 áhættufærslu.",
  );
  await expect(summarySection).toHaveAttribute("data-summary-readiness", "ready");
  await expect(
    summarySection.locator("[data-export-button-state]"),
  ).toBeEnabled();
});

function seedCompletedConstructionWalkthrough(assessmentId: string) {
  execFileSync(
    "pnpm",
    ["exec", "tsx", "e2e/scripts/seedCompletedConstructionWalkthrough.ts", assessmentId],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  );
}
