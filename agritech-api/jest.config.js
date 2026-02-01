module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/__tests__/**/*.(test|spec).ts',
        '**/*.(test|spec).ts'
    ],
    transform: {
        '^.+\\.(t|j)s$': ['@swc/jest', {
            jsc: {
                parser: {
                    syntax: 'typescript',
                    decorators: true,
                },
                transform: {
                    decoratorMetadata: true,
                },
            },
        }],
    },
    collectCoverageFrom: ['src/**/*.(t|j)s', '!src/**/*.spec.ts'],
    coverageDirectory: './coverage',
    testEnvironment: 'node',
    bail: false,
    maxWorkers: '50%',
    testTimeout: 30000,
    detectOpenHandles: false,
    forceExit: true,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    },
};
