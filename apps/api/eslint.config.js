module.exports = {
  root: true,
  env: {
    node: true,
    jest: true,
  },
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {
    // Basic rules for Node.js API
    "no-console": "warn",
    "no-unused-vars": "warn",
  },
};
