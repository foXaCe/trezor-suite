import { selectFlags } from '@suite/flags';
import { Translation } from '@suite/intl';
import { openModal } from '@suite/modal';
import { SettingsAnchor } from '@suite/router';
import { Context } from '@suite-common/message-system';
import { type NetworkSymbol } from '@suite-common/wallet-config';
import {
    changeCoinVisibility,
    selectDeviceSupportedNetworks,
    selectEnabledNetworks,
} from '@suite-common/wallet-core';
import { Column } from '@trezor/components';
import { hasBitcoinOnlyFirmware, isBitcoinOnlyDevice } from '@trezor/device-utils';

import { DeviceBanner } from 'src/components/settings/DeviceBanner';
import { SettingsLayout } from 'src/components/settings/SettingsLayout';
import { SettingsSection } from 'src/components/settings/SettingsSection';
import { SettingsSectionItem } from 'src/components/settings/SettingsSectionItem';
import { CoinList } from 'src/components/suite/CoinList/CoinList';
import { ContextMessage } from 'src/components/wallet/WalletLayout/AccountBanners/ContextMessage';
import { useNetworkSupport } from 'src/hooks/settings/useNetworkSupport';
import { useDevice, useDispatch, useSelector } from 'src/hooks/suite';
import { selectHasExperimentalFeature } from 'src/selectors/suite/suiteSelectors';
import { isCoinjoinSupportedSymbol } from 'src/utils/wallet/coinjoinUtils';

import { FirmwareTypeSuggestion } from './FirmwareTypeSuggestion';

export const SettingsCoins = () => {
    const dispatch = useDispatch();
    const { firmwareTypeBannerClosed } = useSelector(selectFlags);
    const enabledNetworks = useSelector(selectEnabledNetworks);
    const { showUnsupportedCoins, supportedMainnets, unsupportedMainnets, supportedTestnets } =
        useNetworkSupport();
    const deviceSupportedNetworkSymbols = useSelector(selectDeviceSupportedNetworks);
    const { device } = useDevice();
    const useTestnetNetworks = useSelector(selectHasExperimentalFeature('testnet-networks'));

    const supportedEnabledNetworks = enabledNetworks.filter(enabledNetwork =>
        deviceSupportedNetworkSymbols.includes(enabledNetwork),
    );

    const bitcoinOnlyFirmware = hasBitcoinOnlyFirmware(device);

    const onlyBitcoinNetworksEnabled =
        !!supportedEnabledNetworks.length &&
        supportedEnabledNetworks.every(symbol => isCoinjoinSupportedSymbol(symbol));
    const bitcoinOnlyDevice = isBitcoinOnlyDevice(device);

    const showDeviceBanner = device?.connected === false; // device is remembered and disconnected
    const showFirmwareTypeBanner =
        !firmwareTypeBannerClosed &&
        device &&
        !bitcoinOnlyDevice &&
        (bitcoinOnlyFirmware || (!bitcoinOnlyFirmware && onlyBitcoinNetworksEnabled));

    const onToggle = (symbol: NetworkSymbol, isEnabled?: boolean) => {
        dispatch(
            changeCoinVisibility({
                symbol,
                shouldBeVisible: isEnabled ?? true,
            }),
        );
    };

    const onSettings = (symbol: NetworkSymbol) => {
        dispatch(
            openModal({
                type: 'advanced-coin-settings',
                symbol,
            }),
        );
    };

    return (
        <SettingsLayout>
            <ContextMessage context={Context.getSettings('networks')} />

            <Column gap={16}>
                {showDeviceBanner && (
                    <DeviceBanner
                        title={
                            <Translation id="TR_SETTINGS_COINS_BANNER_DESCRIPTION_REMEMBERED_DISCONNECTED" />
                        }
                    />
                )}

                {showFirmwareTypeBanner && <FirmwareTypeSuggestion />}
            </Column>

            <SettingsSection title={<Translation id="TR_COINS" />} icon="coin" hasContainer={false}>
                <SettingsSectionItem anchorId={SettingsAnchor.Crypto}>
                    <CoinList
                        networks={supportedMainnets}
                        enabledNetworks={enabledNetworks}
                        onClick={onToggle}
                        onToggle={onToggle}
                        onSettings={onSettings}
                    />
                </SettingsSectionItem>
            </SettingsSection>

            {useTestnetNetworks && (
                <SettingsSection
                    tooltipText={<Translation id="TR_TESTNET_COINS_DESCRIPTION" />}
                    title={<Translation id="TR_TESTNET_COINS" />}
                    icon="coin"
                    hasContainer={false}
                >
                    <SettingsSectionItem anchorId={SettingsAnchor.TestnetCrypto}>
                        <CoinList
                            networks={supportedTestnets}
                            enabledNetworks={enabledNetworks}
                            onClick={onToggle}
                            onToggle={onToggle}
                            onSettings={onSettings}
                        />
                    </SettingsSectionItem>
                </SettingsSection>
            )}

            {showUnsupportedCoins && (
                <SettingsSection
                    tooltipText={<Translation id="TR_UNSUPPORTED_COINS_DESCRIPTION" />}
                    title={<Translation id="TR_UNSUPPORTED_COINS" />}
                    icon="coin"
                    hasContainer={false}
                >
                    <SettingsSectionItem anchorId={SettingsAnchor.UnsupportedCrypto}>
                        <CoinList
                            networks={unsupportedMainnets}
                            enabledNetworks={enabledNetworks}
                            onClick={onToggle}
                            onToggle={onToggle}
                            onSettings={onSettings}
                        />
                    </SettingsSectionItem>
                </SettingsSection>
            )}
        </SettingsLayout>
    );
};
