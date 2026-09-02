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
  ]),
  // NOTE: eslint-plugin-jsx-a11y's recommended rules are already enabled via
  // eslint-config-next/core-web-vitals. Registering `jsxA11y.flatConfigs.recommended`
  // here used to fail with 'Cannot redefine plugin "jsx-a11y"' (the plugin is
  // bundled by eslint-config-next), which crashed the whole lint job.
  ...storybook.configs["flat/recommended"],
]);

export default eslintConfig;
