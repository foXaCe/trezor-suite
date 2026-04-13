import { type ConsoleMessage, expect, test } from '@playwright/test';

/**
 * Navigates key connect-explorer pages and asserts no console.error messages appear.
 * Catches hydration mismatches, runtime errors, and other client-side issues.
 */

function getConnectExplorerUrl() {
    return process.env.CONNECT_EXPLORER_URL ?? 'http://localhost:8088/';
}

const pagesToCheck = [
    '',
    'methods/bitcoin/getAddress/',
    'readme/connect/',
    'guides/webextension-implementation-tutorial/',
    'details/deeplinking/',
];

// Known non-critical warnings that shouldn't fail the test.
const ignoredErrors: string[] = [
    // Next.js dev mode deprecation warnings for legacyBehavior (tracked separately).
    'legacyBehavior',
];

function isIgnoredError(text: string): boolean {
    return ignoredErrors.some(ignored => text.includes(ignored));
}

test.describe('Connect Explorer - no console errors', { tag: ['@webOnly', '@T3T1'] }, () => {
    for (const path of pagesToCheck) {
        test(`no console.error on /${path}`, async ({ page }) => {
            const errors: string[] = [];

            page.on('console', (msg: ConsoleMessage) => {
                if (msg.type() === 'error' && !isIgnoredError(msg.text())) {
                    errors.push(msg.text());
                }
            });

            await page.goto(`${getConnectExplorerUrl()}${path}`, {
                waitUntil: 'load',
            });

            // Give time for hydration and any deferred rendering.
            await page.waitForTimeout(2000);

            expect(errors, `Console errors on /${path}:\n${errors.join('\n')}`).toHaveLength(0);
        });
    }
});
