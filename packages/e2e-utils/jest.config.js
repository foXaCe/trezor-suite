const baseConfig = require('../../jest.config.base');

module.exports = {
    ...baseConfig,
    testEnvironment: 'node',
    // Exclude Playwright seed specs – they run via pwc, not Jest
    testPathIgnorePatterns: [...(baseConfig.testPathIgnorePatterns ?? []), '/seed/'],
};
