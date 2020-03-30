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
    'episode-5/cpu.js',
    'episode-5/create-memory.js',
    'episode-5/instructions.js',
    'episode-5/memory-mapper.js',
    'episode-5/screen-device.js'
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
