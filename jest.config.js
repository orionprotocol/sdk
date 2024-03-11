import preset from 'ts-jest/presets/index.js'

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  ...preset.defaultsESM,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  modulePathIgnorePatterns: ['lib', 'node_modules'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        //  tsconfig: 'tsconfig.json',
        useESM: true,
      },
    ],
  },
}

// const config: JestConfigWithTsJest = {
//   extensionsToTreatAsEsm: ['.ts'],
//   moduleNameMapper: {
//     '^(\\.{1,2}/.*)\\.js$': '$1',
//   },
//   preset: 'ts-jest/presets/default-esm',
//   testEnvironment: 'node',
//   testMatch: ['**/__tests__/**/*.test.ts'],
//   modulePathIgnorePatterns: ['lib', 'node_modules'],
//   transform: {
//     // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
//     // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
//     '^.+\\.tsx?$': [
//       'ts-jest',
//       {
//         useESM: true,
//       },
//     ],
//   },
// };
// export default config;
