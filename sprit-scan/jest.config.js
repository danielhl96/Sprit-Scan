module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^.*app/api/api-root-domain$': '<rootDir>/src/test/mocks/api-root-domain.mock.ts',
  },
};
