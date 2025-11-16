export default {
    extends: [
      "eslint:recommended",
      "plugin:prettier/recommended" // enables eslint-plugin-prettier & prettier config
    ],
    rules: {
      "prettier/prettier": ["error", {
        singleQuote: true,
        semi: true,
        printWidth: 80,
        trailingComma: "es5"
      }],
    },
  };