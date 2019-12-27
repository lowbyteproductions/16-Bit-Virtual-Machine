module.exports = {
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[tj]s?(x)"
  ],
  testPathIgnorePatterns: [
    "/node_modules/"
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'episode-4/cpu.js',
    'episode-4/create-memory.js',
    'episode-4/instructions.js'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
};
