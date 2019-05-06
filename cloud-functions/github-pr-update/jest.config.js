module.exports = {
  roots: ['<rootDir>/test'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(ts)$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsConfig: 'jest.tsconfig.json',
    },
  },
  testMatch: ['**/*.test.ts'],
};
