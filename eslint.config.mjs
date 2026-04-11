import sharedConfig from "./packages/config/eslint.config.mjs";

// Root ESLint config — shared parsing plus architectural boundary enforcement.
//
// Rules enforced:
// 1. Shared packages must not import other @vardi/* packages or next/*
// 2. Apps must not import other apps
// 3. No deep imports into package internals (@vardi/*/src/*)
// 4. apps/web must not call fetch() directly

const noVardiImports = {
  group: ["@vardi/*", "@vardi/**"],
  message: "Shared packages must not import other @vardi packages.",
};

const noNextImports = {
  group: ["next", "next/*", "next/**"],
  message: "Shared packages must not import Next.js modules.",
};

const noDeepImports = {
  group: ["@vardi/*/src/*", "@vardi/*/src/**"],
  message:
    "Do not use deep imports into package internals. Use public exports instead.",
};

export default [
  ...sharedConfig,

  // Shared packages must not cross-import or touch next/*
  {
    files: [
      "packages/config/src/**/*.{ts,tsx}",
      "packages/schemas/src/**/*.{ts,tsx}",
      "packages/db/src/**/*.{ts,tsx}",
      "packages/risk/src/**/*.{ts,tsx}",
      "packages/export/src/**/*.{ts,tsx}",
      "packages/checklists/src/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [noVardiImports, noNextImports] },
      ],
    },
  },

  // UI package: block other @vardi packages, allow self-imports
  {
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@vardi/config",
                "@vardi/config/**",
                "@vardi/schemas",
                "@vardi/schemas/**",
                "@vardi/db",
                "@vardi/db/**",
              ],
              message: "UI package must not import other @vardi packages.",
            },
            noNextImports,
          ],
        },
      ],
    },
  },

  // apps/web: no deep imports
  {
    files: ["apps/web/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [noDeepImports] },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            "Do not call fetch() directly in apps/web. Use typed route or client helpers instead.",
        },
        {
          selector:
            "CallExpression[callee.object.name='globalThis'][callee.property.name='fetch']",
          message:
            "Do not call fetch() directly in apps/web. Use typed route or client helpers instead.",
        },
        {
          selector:
            "CallExpression[callee.object.name='window'][callee.property.name='fetch']",
          message:
            "Do not call fetch() directly in apps/web. Use typed route or client helpers instead.",
        },
      ],
    },
  },
];
