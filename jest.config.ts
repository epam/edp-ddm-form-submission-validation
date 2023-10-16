import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  moduleNameMapper: {
    '^#app/(.*)': '<rootDir>/src/$1',
  },
};

export default config;
