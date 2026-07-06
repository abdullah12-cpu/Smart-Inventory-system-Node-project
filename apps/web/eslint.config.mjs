import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        alert: "readonly",
        React: "readonly",
        MouseEvent: "readonly"
      }
    }
  }
];
