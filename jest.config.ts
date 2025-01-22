import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  testMatch: [
    '<rootDir>/tests/**/*.{spec,test}.{ts,tsx}',
  ],
  roots: ['<rootDir>/tests', '<rootDir>/server'],
};

export default config;