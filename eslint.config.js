import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier, // must be last so it overrides conflicting rules
  {
    ignores: ["dist/", "node_modules/"],
  }
);
