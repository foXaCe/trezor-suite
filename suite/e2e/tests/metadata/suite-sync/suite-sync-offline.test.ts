import {
    WALLET_INDEX,
    accountDescriptor,
    ownerId,
    ownerSecret,
    walletDescriptor,
} from '../../../fixtures/metadata/default-metadata-ids';
import { launchSuite } from '../../../support/electron';
import { AccountLabelId } from '../../../support/enums/accountLabelId';
import { expect, test } from '../../../support/fixtures';
import { AnalyticsSection } from '../../../support/pageObjects/analyticsSection';
import { DashboardPage } from '../../../support/pageObjects/dashboardPage';
import { DevicePrompt } from '../../../support/pageObjects/devicePrompt';
import { MetadataPage } from '../../../support/pageObjects/metadata/metadataPage';
import { OnboardingPage } from '../../../support/pageObjects/onboarding/onboardingPage';
import { SettingsPage } from '../../../support/pageObjects/settings/settingsPage';
import { WalletPage } from '../../../support/pageObjects/walletPage';
import { enhancePage } from '../../../support/testExtends/enhancePage';

const expectedWallet = {
    updatedAt: null,
    isDeleted: null,
    ownerId,
    walletDescriptor,
    label: 'Evolu write wallet',
};

const expectedAccount = {
    updatedAt: null,
    isDeleted: null,
    ownerId,
    accountDescriptor,
    networkSymbol: 'btc',
    label: 'Evolu write BTC account',
};

test.describe(
    'Suite Sync - Labelling',
    { tag: ['@specificFirmware', '@T3T1'] },
    () => {
        test.use({
            deviceSetup: { passphrase_protection: true },
        });

        test.use({ context: undefined });
        test.beforeEach(({ evoluClient }) => {
            evoluClient.wipeAndRestartServer();
        });

        test('Create new labels', async ({
            evoluClient,
            device,
        }, testInfo) => {
            
            const suite = await launchSuite({
                offlineMode: true,
                artefactFolder: testInfo.outputDir,
                viewport: testInfo.project.use.viewport!,
            });
             enhancePage(suite.window);
                    await suite.window.title();
            
                    const devicePrompt = new DevicePrompt(suite.window, device);
            
                    const onboardingPage = new OnboardingPage(
                        suite.window,
                        device,
                        devicePrompt,
                        new AnalyticsSection(suite.window),
                        new SettingsPage(suite.window, device),
                    );
                    const metadataPage = new MetadataPage(
                        suite.window,
                        device,
                        new SettingsPage(suite.window, device),
                        devicePrompt,
                    );
                    const walletPage = new WalletPage(suite.window);
                    const dashboardPage = new DashboardPage(suite.window, device, devicePrompt);
            await onboardingPage.completeOnboarding({ keepDebugModeEnabled: true });
            await metadataPage.setupQuotaManager();
            await metadataPage.enableSuiteSync();

            await test.step('Verify BTC account label is synced', async () => {
                await walletPage.accountButton({ symbol: 'btc', type: 'normal', atIndex: 0 }).click();
                await metadataPage.account.changeLabel({
                    accountId: AccountLabelId.BitcoinDefault1,
                    label: expectedAccount.label,
                });

                // musime zakazat localhost pro local relay v offline modu;
                // web test bude ciste o spatne port URL relaye
                // pri vypnuti a zapnuti electronu pouzit keep data parametr
                //  offline banner nebyl videt?

                await expect
                    .soft(walletPage.accountLabel({ symbol: 'btc', type: 'normal', atIndex: 0 }))
                    .toHaveText(expectedAccount.label, { timeout: 30_000 });
            });

            await test.step('Change wallet label', async () => {
                await dashboardPage.openDeviceSwitcher();
                await metadataPage.wallet.changeLabel({
                    index: WALLET_INDEX,
                    label: expectedWallet.label,
                });
                await expect
                    .soft(metadataPage.wallet.walletLabel(WALLET_INDEX))
                    .toHaveText(expectedWallet.label);
                await dashboardPage.deviceSwitchingCloseButton.click();
            });

            await test.step('Verify data are sync to Relay', async () => {
                await evoluClient.init({ ownerSecret });
                await evoluClient.expectInTable('account', [expectedAccount], { softExpect: true });
                await evoluClient.expectInTable('wallet', [expectedWallet], { softExpect: true });
            });
        });
    },
);
