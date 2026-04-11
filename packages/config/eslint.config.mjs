import tseslint from "typescript-eslint";

const sharedConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/{eslint,prettier,postcss,tailwind,next,vitest,jest,playwright,drizzle}.config.*",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },

  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
];

export default sharedConfig;
