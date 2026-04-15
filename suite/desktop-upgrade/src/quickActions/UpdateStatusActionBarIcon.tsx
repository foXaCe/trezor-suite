import { useDispatch, useSelector } from 'react-redux';

import { type Dispatch } from '@reduxjs/toolkit';

import { selectSelectedDevice } from '@suite-common/device';
import { selectHasRunningDiscovery } from '@suite-common/wallet-core';
import { isDesktop } from '@trezor/env-utils';
import { QuickActionButton, mapTrezorModelToIcon } from '@trezor/product-components';

import { UpdateTooltip } from './UpdateTooltip';
import { type DesktopUpgradeQuickActionsRootState } from './quickActionsRootState';
import {
    mapDeviceUpdateToClick,
    mapSuiteUpdateToClick,
    mapUpdateStatusToIcon,
    mapUpdateStatusToIntent,
} from './updateQuickActionTypes';
import { useUpdateStatus } from './useUpdateStatus';

type UpdateStatusActionBarIconProps = {
    hideUpdateQuickAction: boolean;
};

export const UpdateStatusActionBarIcon = ({
    hideUpdateQuickAction,
}: UpdateStatusActionBarIconProps) => {
    const { updateStatus, updateStatusDevice, updateStatusSuite } = useUpdateStatus();
    const discoveryInProgress = useSelector((state: DesktopUpgradeQuickActionsRootState) =>
        selectHasRunningDiscovery(state),
    );
    const displayDeviceUpdateStatusBar = !discoveryInProgress;

    const device = useSelector((state: DesktopUpgradeQuickActionsRootState) =>
        selectSelectedDevice(state),
    );
    const dispatch = useDispatch<Dispatch>();

    const updateSubIcon = mapUpdateStatusToIcon[updateStatus];

    const isDesktopSuite = isDesktop();

    const suiteOnClick = mapSuiteUpdateToClick[updateStatusSuite];
    const deviceOnClick = displayDeviceUpdateStatusBar
        ? mapDeviceUpdateToClick[updateStatusDevice]
        : null;

    const suiteOnClickHandler = suiteOnClick ? () => suiteOnClick({ dispatch }) : undefined;
    const deviceOnClickHandler = deviceOnClick ? () => deviceOnClick({ dispatch }) : undefined;

    const handleClick = () => {
        if (updateStatusSuite !== 'up-to-date') {
            suiteOnClickHandler?.();
        } else if (updateStatusDevice !== 'up-to-date') {
            deviceOnClickHandler?.();
        }
    };

    const anyUpdateInfoAvailable = isDesktopSuite || displayDeviceUpdateStatusBar;

    if (!anyUpdateInfoAvailable) {
        return null;
    }

    return (
        <QuickActionButton
            onClick={handleClick}
            tooltip={{
                isActive: !hideUpdateQuickAction,
                content: (
                    <UpdateTooltip
                        displayDeviceUpdateStatus={displayDeviceUpdateStatusBar}
                        updateStatusDevice={updateStatusDevice}
                        onClickSuite={suiteOnClickHandler}
                        updateStatusSuite={updateStatusSuite}
                        onClickDevice={deviceOnClickHandler}
                    />
                ),
            }}
            iconName={
                updateStatusSuite !== 'up-to-date' || !device?.features
                    ? 'trezorLogo'
                    : mapTrezorModelToIcon[device.features.internal_model]
            }
            subIconIntent={mapUpdateStatusToIntent[updateStatus]}
            subIconName={updateSubIcon}
        />
    );
};
