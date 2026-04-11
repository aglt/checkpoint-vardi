import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { listSeedChecklists } from "@vardi/checklists";
import { renderToStaticMarkup } from "react-dom/server";

test("the start entry page shows both seeded templates", async () => {
  const { default: StartAssessmentPage } = await import("../../app/page");
  const markup = renderToStaticMarkup(
    await StartAssessmentPage({
      searchParams: Promise.resolve({}),
    }),
  );

  for (const template of listSeedChecklists()) {
    assert.match(markup, new RegExp(escapeRegExp(template.translations.is.title)));
  }
});

test("form submission redirects to the assessment readiness page", async () => {
  process.env.VARDI_DATABASE_PATH = join(
    mkdtempSync(join(tmpdir(), "vardi-s1-03-")),
    "checkpoint-vardi.db",
  );

  const { POST } = await import("../../app/api/assessments/route");

  const formData = new FormData();
  formData.set("workplaceName", "Workshop");
  formData.set("workplaceAddress", "Austurberg 1");
  formData.set("workplaceArchetype", "construction");
  formData.set("checklistId", "checklist.woodworking-workshop");

  const response = await POST(
    new Request("http://localhost:3000/api/assessments", {
      method: "POST",
      body: formData,
    }),
  );

  assert.equal(response.status, 303);

  const location = response.headers.get("location");
  assert.ok(location);
  assert.match(location, /\/assessments\/[0-9a-f-]+$/);
});

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
