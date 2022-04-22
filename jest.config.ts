import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  verbose: true,
  preset: 'ts-jest',
  testRegex: "src/.*\\.test\\.ts$",
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
  testEnvironment: 'node',
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  rootDir: ".",
  globals: {
    "ts-jest": {
      "tsconfig": "tsconfig.json"
    }
  },
  setupFiles: ["dotenv/config"]
};
export default config;
