import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    // Pin react version explicitly to avoid eslint-plugin-react's 'detect'
    // calling context.getFilename() which changed in ESLint 9/10.
    settings: {
      react: {
        version: "19.0",
      },
    },
  },
  {
    // Project-level rule adjustments for the axios-kings-landing codebase.
    rules: {
      "react/no-unescaped-entities": "warn",
    },
  },
  {
    // Ignore vitest + playwright test stubs — they use @ts-nocheck and import
    // test-only globals that are not in the root tsconfig.
    ignores: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "e2e/**",
      "dist/**",
      "node_modules/**",
    ],
  },
];
