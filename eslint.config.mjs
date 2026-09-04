import storybook from "eslint-plugin-storybook";
import jsxA11y from "eslint-plugin-jsx-a11y";

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
  ]),
  // eslint-config-next already registers the jsx-a11y plugin, so only apply
  // the recommended rules here — re-registering the plugin would throw
  // "Cannot redefine plugin jsx-a11y".
  {
    name: "jsx-a11y/recommended",
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  ...storybook.configs["flat/recommended"],
  {
    name: "react-hooks/compiler-rules-as-warnings",
    rules: {
      // eslint-config-next@16 turns the React Compiler guidance rules on as
      // errors. This codebase is not compiler-enabled and predates them, so
      // demote the advisory rules to warnings (kept visible) while the classic
      // rules (exhaustive-deps, rules-of-hooks) stay enforced.
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);

export default eslintConfig;
