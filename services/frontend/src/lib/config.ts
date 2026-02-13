// Environment configuration

const testModeEnv = import.meta.env.VITE_TEST_MODE;
const isTestMode =
    testModeEnv !== undefined &&
    (testModeEnv === 'True' || testModeEnv === 'true' || testModeEnv === '1');

export const config = {
    // --- FIX: Use relative path for Nginx proxying ---
    // --- FIX: Hardcoded to ensure correct path in production ---
    apiBaseUrl: '/airbud/api',
    // ----------------------------------
    isTestMode: isTestMode,
    qaModelName: isTestMode ? "llama-4-scout-17b-16e-instruct" : "claude-3.5-sonnet",

    endpoints: {
        health: '/',
        sessions: '/collections',
        upload: '/upload',
        process: '/process',
        query: '/query',
    },
};