import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            reporter: ['text', 'html', 'lcov'],
            exclude: ['node_modules', '**/tests/**', '**/*.test.ts', '**/dist/**'],
            include: ['src/**/*.ts'],
            all: true,
            provider: 'v8',
            reportsDirectory: 'coverage',
        },
    },
});
