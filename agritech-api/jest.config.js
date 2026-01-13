module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    // Match both .test.ts and .spec.ts files
    // Use testMatch instead of testRegex for better compatibility
    testMatch: [
        '**/__tests__/**/*.(test|spec).ts',
        '**/*.(test|spec).ts'
    ],
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
    // Ensure all tests run
    bail: false,
    maxWorkers: '50%',
    // Increase timeout for complex tests
    testTimeout: 30000,
    // Don't exit on open handles (helps with async tests)
    detectOpenHandles: false,
    forceExit: true,
};
