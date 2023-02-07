import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  modulePathIgnorePatterns: ['lib', 'node_modules'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    },
};
export default config;
