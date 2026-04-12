import { expect, test } from '../../../support/fixtures';

test.describe('Onboarding - Create Wallet', { tag: ['@T3W1'] }, () => {
    test.use({
        setupEmulator: false,
    });

    test.beforeEach(async ({ onboardingPage }) => {
        await onboardingPage.disableNecessaryFirmwareChecks();
    });

    const backupType = 'Single-share Backup';

    test(`Success (${backupType})`, async ({
        page,
        device,
        devicePrompt,
        onboardingPage,
        analyticsSection,
    }) => {
        await analyticsSection.continueButton.click();

        await test.step('Device onboarding', async () => {
            await onboardingPage.pairTHP();
            await analyticsSection.continueButton.click();
            await onboardingPage.firmware.continueThroughFirmware();
            await page.waitForTimeout(500);
            await onboardingPage.tutorial.skip();
        });

        await test.step('Creat a new wallet', async () => {
            await onboardingPage.createWalletButton.click();

            await expect(onboardingPage.walletBackupTypeCard).toBeVisible();
        });

        await test.step(`Select "${backupType}" type`, async () => {
            await onboardingPage.selectSeedType('shamir-single');
        });

        await test.step('Create a wallet backup', async () => {
            await onboardingPage.backup.passThroughShamirBackup({
                deviceConfirmations: 3,
            });
        });

        await test.step('Set PIN', async () => {
            await onboardingPage.pin.setPinButton.click();
            await devicePrompt.confirmOnDevicePromptIsShown();
            await device.pressYes();
            await device.selectNumberOfWords(12);
            await device.selectNumberOfWords(12);

            await devicePrompt.confirmOnDevicePromptIsShown();
            await device.pressYes();
        });
    });

    test.fixme('Cancel wallet creation on device', async () => {});
    test.fixme('Cancel wallet backup on device', async () => {});
    test.fixme('Skip wallet backup', async () => {});
    test.fixme('Skip wallet backup - cancel wallet creation on device', async () => {});
});
