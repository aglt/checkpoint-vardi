import nextPlugin from "@next/eslint-plugin-next";
import sharedConfig from "../../packages/config/eslint.config.mjs";

const noDeepImports = {
  group: ["@vardi/*/src/*", "@vardi/*/src/**"],
  message:
    "Do not use deep imports into package internals. Use public exports instead.",
};

const noDirectFetchSelectors = [
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
];

export default [
  ...sharedConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    settings: {
      next: {
        rootDir: ".",
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "@next/next/no-html-link-for-pages": "off",
      "no-restricted-imports": [
        "error",
        { patterns: [noDeepImports] },
      ],
      "no-restricted-syntax": ["error", ...noDirectFetchSelectors],
    },
  },
];
