import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: [
    "eslint",
    "typescript",
    "unicorn",
    "react",
    "react-perf",
    "import",
    "jsdoc",
    "jsx-a11y",
    "node",
    "promise",
    "oxc",
  ],
  categories: {
    correctness: "error",
  },
  env: {
    builtin: true,
  },
});
