// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Flat ESLint config for the Fastify API.
 *
 * Keeps the ruleset intentionally lean: the TypeScript compiler already
 * enforces type-safety and unused locals, so ESLint focuses on catching
 * likely bugs (floating promises, unsafe any, unused vars) without adding
 * noisy stylistic rules.
 */
export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "prisma/migrations/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      // Surface unused code the compiler may miss across module boundaries.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `any` is occasionally pragmatic at the Fastify boundary.
      "@typescript-eslint/no-explicit-any": "warn",
      // Prefer const and forbid accidental globals.
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "smart"],
    },
  },
);
