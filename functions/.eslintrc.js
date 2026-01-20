module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
    "sourceType": "script",
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "single", {"allowTemplateLiterals": true}],
    "no-undef": "off", // Disable for CommonJS globals
  },
  globals: {
    "require": "readonly",
    "module": "readonly",
    "exports": "readonly",
    "process": "readonly",
    "__dirname": "readonly",
    "__filename": "readonly",
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
};
