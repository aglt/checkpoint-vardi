import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyRisk,
  InvalidRiskScoreError,
  MissingRiskMatrixLookupError,
  type RiskMatrixDefinition,
  type RiskLevel,
} from "./index.js";

const matrices: ReadonlyArray<{
  readonly label: string;
  readonly matrix: RiskMatrixDefinition;
  readonly expectedCells: Readonly<Record<string, RiskLevel>>;
}> = [
  {
    label: "2x2",
    matrix: {
      likelihoodLevels: 2,
      consequenceLevels: 2,
      lookup: {
        "1,1": "low",
        "1,2": "medium",
        "2,1": "medium",
        "2,2": "high",
      },
    },
    expectedCells: {
      "1,1": "low",
      "1,2": "medium",
      "2,1": "medium",
      "2,2": "high",
    },
  },
  {
    label: "3x3",
    matrix: {
      likelihoodLevels: 3,
      consequenceLevels: 3,
      lookup: {
        "1,1": "low",
        "1,2": "low",
        "1,3": "medium",
        "2,1": "low",
        "2,2": "medium",
        "2,3": "high",
        "3,1": "medium",
        "3,2": "high",
        "3,3": "high",
      },
    },
    expectedCells: {
      "1,1": "low",
      "1,2": "low",
      "1,3": "medium",
      "2,1": "low",
      "2,2": "medium",
      "2,3": "high",
      "3,1": "medium",
      "3,2": "high",
      "3,3": "high",
    },
  },
  {
    label: "5x5",
    matrix: {
      likelihoodLevels: 5,
      consequenceLevels: 5,
      lookup: {
        "1,1": "low",
        "1,2": "low",
        "1,3": "low",
        "1,4": "low",
        "1,5": "medium",
        "2,1": "low",
        "2,2": "low",
        "2,3": "medium",
        "2,4": "medium",
        "2,5": "high",
        "3,1": "low",
        "3,2": "medium",
        "3,3": "medium",
        "3,4": "high",
        "3,5": "high",
        "4,1": "medium",
        "4,2": "medium",
        "4,3": "high",
        "4,4": "high",
        "4,5": "high",
        "5,1": "medium",
        "5,2": "high",
        "5,3": "high",
        "5,4": "high",
        "5,5": "high",
      },
    },
    expectedCells: {
      "1,1": "low",
      "1,2": "low",
      "1,3": "low",
      "1,4": "low",
      "1,5": "medium",
      "2,1": "low",
      "2,2": "low",
      "2,3": "medium",
      "2,4": "medium",
      "2,5": "high",
      "3,1": "low",
      "3,2": "medium",
      "3,3": "medium",
      "3,4": "high",
      "3,5": "high",
      "4,1": "medium",
      "4,2": "medium",
      "4,3": "high",
      "4,4": "high",
      "4,5": "high",
      "5,1": "medium",
      "5,2": "high",
      "5,3": "high",
      "5,4": "high",
      "5,5": "high",
    },
  },
] as const;

test("classifyRisk returns the expected lookup value for every configured matrix cell", () => {
  for (const { label, matrix, expectedCells } of matrices) {
    for (const [key, expectedRiskLevel] of Object.entries(expectedCells)) {
      const [likelihood, consequence] = key.split(",").map(Number);

      assert.equal(
        classifyRisk({
          matrix,
          likelihood,
          consequence,
        }),
        expectedRiskLevel,
        `${label} should classify ${key} as ${expectedRiskLevel}`,
      );
    }
  }
});

test("classifyRisk returns null until both scores are present", () => {
  const matrix = matrices[1]?.matrix;

  if (!matrix) {
    throw new Error("Expected 3x3 matrix fixture to exist.");
  }

  assert.equal(
    classifyRisk({
      matrix,
      likelihood: null,
      consequence: 2,
    }),
    null,
  );
  assert.equal(
    classifyRisk({
      matrix,
      likelihood: 2,
      consequence: undefined,
    }),
    null,
  );
});

test("classifyRisk rejects out-of-range axis scores deterministically", () => {
  const matrix = matrices[1]?.matrix;

  if (!matrix) {
    throw new Error("Expected 3x3 matrix fixture to exist.");
  }

  assert.throws(
    () =>
      classifyRisk({
        matrix,
        likelihood: 4,
        consequence: 2,
      }),
    (error: unknown) =>
      error instanceof InvalidRiskScoreError &&
      error.message.includes("likelihood"),
  );
  assert.throws(
    () =>
      classifyRisk({
        matrix,
        likelihood: 2,
        consequence: 0,
      }),
    (error: unknown) =>
      error instanceof InvalidRiskScoreError &&
      error.message.includes("consequence"),
  );
});

test("classifyRisk rejects missing matrix lookup cells deterministically", () => {
  assert.throws(
    () =>
      classifyRisk({
        matrix: {
          likelihoodLevels: 2,
          consequenceLevels: 2,
          lookup: {
            "1,1": "low",
            "1,2": "medium",
            "2,1": "medium",
          },
        },
        likelihood: 2,
        consequence: 2,
      }),
    (error: unknown) => error instanceof MissingRiskMatrixLookupError,
  );
});
