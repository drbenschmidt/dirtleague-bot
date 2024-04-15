module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
//   roots: ['<rootDir>/src'],
  testMatch: [
    "<rootDir>/modules/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/modules/**/*.{spec,test}.{js,jsx,ts,tsx}"
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
