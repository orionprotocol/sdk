module.exports = {
  ignorePatterns: ['.eslintrc.js'],
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'standard',
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/typescript'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: [
        "./tsconfig.json"
    ],
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    "comma-dangle": 0,
    "semi": 0,
    "space-before-function-paren": 0,
    "@typescript-eslint/explicit-function-return-type": 0,
    "no-param-reassign": [
      "error",
      {
        "props": true,
        "ignorePropertyModificationsFor": ["acc", "prev"]
      }
    ],
    "camelcase": "off",
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      {
        assertionStyle: 'never',
      },
    ],
    'import/max-dependencies': [
      'error',
      {
        max: 20,
        ignoreTypeImports: false,
      },
    ],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],
    'max-len': [
      1,
      140,
      2,
      {
        ignoreComments: true,
      }
    ],
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
};
