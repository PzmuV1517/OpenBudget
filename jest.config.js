/**
 * Jest runs only the pure lib/ logic (money + receipt parsing) in a plain Node
 * environment. These modules have no React Native or native-module imports, so
 * we skip the heavier jest-expo preset. UI is verified in the dev build.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    // Lib tests are platform-agnostic; isolatedModules keeps them fast.
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
};
