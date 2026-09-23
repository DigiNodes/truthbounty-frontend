import storybook from "eslint-plugin-storybook";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "node_modules/**",
    "*.log",
  ]),
  ...storybook.configs["flat/recommended"],
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
    },
  },
  {
    files: [
      "**/__tests__/**/*",
      "**/*.test.*",
      "**/*.spec.*",
      "**/jest.setup.js",
      "**/test-utils.*",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["**/*.stories.*"],
    rules: {
      "storybook/no-renderer-packages": "off",
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: [
      "src/**/__tests__/**",
      "src/**/__mocks__/**",
      "src/**/*.test.*",
      "src/**/*.spec.*",
      "src/**/*.stories.*",
      "src/stories/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "jest", message: "Jest is restricted to test-only files." },
            { name: "jest-mock", message: "Jest mocks are restricted to test-only files." },
            { name: "msw", message: "MSW handlers are restricted to test-only files." },
            { name: "vitest", message: "Vitest is restricted to test-only files." },
            { name: "@playwright/test", message: "Playwright is restricted to test-only files." },
          ],
          patterns: [
            {
              group: [
                "@/**/__tests__/**",
                "@/**/__mocks__/**",
                "@/**/fixtures/**",
                "@/**/mocks/**",
                "@/stories/**",
                "**/__tests__/**",
                "**/__mocks__/**",
                "**/fixtures/**",
                "**/mocks/**",
                "**/*.test",
                "**/*.spec",
                "@storybook/**",
                "@testing-library/**",
                "@vitest/**",
              ],
              message: "Test fixtures, mocks, and tooling must not be imported by production code.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
