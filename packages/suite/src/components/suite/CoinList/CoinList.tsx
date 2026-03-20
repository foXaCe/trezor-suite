import { Translation } from '@suite/intl';
import { getCoinUnavailabilityMessage } from '@suite-common/suite-utils';
import { type Network, type NetworkSymbol } from '@suite-common/wallet-config';
import { selectBlockchainState } from '@suite-common/wallet-core';
import { Column, Tooltip } from '@trezor/components';
import { getFirmwareVersion, isDeviceInBootloaderMode } from '@trezor/device-utils';
import { versionUtils } from '@trezor/utils';

import { useDevice, useDiscovery, useSelector } from 'src/hooks/suite';
import { getCoinLabel } from 'src/utils/suite/getCoinLabel';

import { CoinCard } from './CoinCard';

export type CoinListProps = {
    networks: Network[];
    enabledNetworks?: NetworkSymbol[];
    onClick: (symbol: NetworkSymbol, isEnabled?: boolean) => void;
    onToggle?: (symbol: NetworkSymbol, isEnabled?: boolean) => void;
    onSettings?: (symbol: NetworkSymbol) => void;
};

export const CoinList = ({
    networks,
    enabledNetworks,
    onClick,
    onToggle,
    onSettings,
}: CoinListProps) => {
    const { device, isLocked } = useDevice();
    const blockchain = useSelector(selectBlockchainState);
    const isDeviceLocked = !!device && isLocked(true);
    const { isDiscoveryRunning } = useDiscovery();
    const lockedTooltip = isDeviceLocked ? 'TR_DISABLED_SWITCH_TOOLTIP' : null;
    const discoveryTooltip = isDiscoveryRunning ? 'TR_LOADING_ACCOUNTS' : null;

    const deviceModelInternal = device?.features?.internal_model;
    const isBootloaderMode = isDeviceInBootloaderMode(device);
    const firmwareVersion = getFirmwareVersion(device);

    const deviceDisplayName = device?.name;

    return (
        <Column gap={12} width="100%">
            {networks.map(network => {
                const { symbol, name, support, features, testnet: isTestnet } = network;
                const hasCustomBackend = !!blockchain[symbol].backends.selected;

                const firmwareSupportRestriction =
                    deviceModelInternal && support?.[deviceModelInternal];
                const isSupportedByApp =
                    !firmwareVersion ||
                    !firmwareSupportRestriction ||
                    versionUtils.isNewerOrEqual(firmwareVersion, firmwareSupportRestriction);

                const unavailableReason = isSupportedByApp
                    ? device?.unavailableCapabilities?.[symbol]
                    : 'update-required';

                const isEnabled = !!enabledNetworks?.includes(symbol);

                const isDisabled =
                    (!!unavailableReason && !isBootloaderMode) ||
                    isDeviceLocked ||
                    !isSupportedByApp;
                const unavailabilityTooltip =
                    !!unavailableReason &&
                    !isBootloaderMode &&
                    getCoinUnavailabilityMessage(unavailableReason);
                const tooltipString = discoveryTooltip || lockedTooltip || unavailabilityTooltip;

                const label = getCoinLabel(features, isTestnet, hasCustomBackend);

                return (
                    <Tooltip
                        key={symbol}
                        placement="top"
                        isActive={!!tooltipString}
                        content={
                            tooltipString && (
                                <Translation
                                    id={tooltipString}
                                    values={{
                                        deviceDisplayName,
                                    }}
                                />
                            )
                        }
                    >
                        <CoinCard
                            symbol={symbol}
                            name={name}
                            label={label}
                            isDisabled={isDisabled}
                            isEnabled={isEnabled}
                            onClick={onClick}
                            onToggle={onToggle}
                            onSettings={onSettings}
                        />
                    </Tooltip>
                );
            })}
        </Column>
    );
};
