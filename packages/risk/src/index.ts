// @vardi/risk — Risk matrix lookup and classify(matrix, L, C) engine.

export type RiskLevel = "low" | "medium" | "high";

export interface RiskMatrixDefinition {
  readonly likelihoodLevels: number;
  readonly consequenceLevels: number;
  readonly lookup: Readonly<Record<string, RiskLevel>>;
}

export interface ClassifyRiskParams {
  readonly matrix: RiskMatrixDefinition;
  readonly likelihood: number | null | undefined;
  readonly consequence: number | null | undefined;
}

export class InvalidRiskScoreError extends Error {
  constructor(
    axis: "likelihood" | "consequence",
    value: number,
    levels: number,
  ) {
    super(
      `Risk ${axis} score ${String(value)} is outside the supported 1-${String(levels)} range.`,
    );
    this.name = "InvalidRiskScoreError";
  }
}

export class MissingRiskMatrixLookupError extends Error {
  constructor(likelihood: number, consequence: number) {
    super(
      `Risk matrix lookup is missing a classification for likelihood ${String(likelihood)} and consequence ${String(consequence)}.`,
    );
    this.name = "MissingRiskMatrixLookupError";
  }
}

export function classifyRisk(params: ClassifyRiskParams): RiskLevel | null {
  if (params.likelihood == null || params.consequence == null) {
    return null;
  }

  assertAxisScore("likelihood", params.likelihood, params.matrix.likelihoodLevels);
  assertAxisScore("consequence", params.consequence, params.matrix.consequenceLevels);

  const riskLevel = params.matrix.lookup[
    createLookupKey(params.likelihood, params.consequence)
  ];

  if (!riskLevel) {
    throw new MissingRiskMatrixLookupError(
      params.likelihood,
      params.consequence,
    );
  }

  return riskLevel;
}

function assertAxisScore(
  axis: "likelihood" | "consequence",
  value: number,
  levels: number,
) {
  if (!Number.isInteger(value) || value < 1 || value > levels) {
    throw new InvalidRiskScoreError(axis, value, levels);
  }
}

function createLookupKey(likelihood: number, consequence: number): string {
  return `${String(likelihood)},${String(consequence)}`;
}
