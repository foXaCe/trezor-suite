import { Translation, type TranslationKey } from '@suite/intl';
import { selectHasRunningDiscovery } from '@suite-common/wallet-core';
import { Text } from '@trezor/components';

import { useDispatch, useSelector } from 'src/hooks/suite';

import {
    type UpdateStatus,
    type UpdateStatusDevice,
    type UpdateStatusSuite,
    mapDeviceUpdateToClick,
    mapSuiteUpdateToClick,
} from './updateQuickActionTypes';
import { SidebarBanner } from '../../SidebarBanner';

type UpdateNotificationBannerProps = {
    updateStatusDevice: UpdateStatusDevice;
    updateStatusSuite: UpdateStatusSuite;
    onClose: () => void;
};

const mapDeviceUpdateStatusToTranslation: Record<UpdateStatusDevice, TranslationKey | null> = {
    disconnected: null,
    'up-to-date': null,
    'update-available': 'TR_QUICK_ACTION_UPDATE_POPOVER_TREZOR_UPDATE_AVAILABLE',
};

const mapSuiteUpdateStatusToHeaderTranslation: Record<UpdateStatusSuite, TranslationKey | null> = {
    'update-downloaded-auto-restart-to-update':
        'TR_QUICK_ACTION_UPDATE_POPOVER_APP_HAS_BEEN_UPDATED',
    'update-downloaded-manual': 'TR_QUICK_ACTION_UPDATE_POPOVER_APP_DOWNLOADED',
    'just-updated': 'TR_QUICK_ACTION_UPDATE_POPOVER_APP_HAS_BEEN_UPDATED',
    'up-to-date': null,
    'update-available': 'TR_QUICK_ACTION_UPDATE_POPOVER_APP_UPDATE_AVAILABLE',
};

const mapSuiteUpdateStatusToCallToActionTranslation: Record<UpdateStatus, TranslationKey | null> = {
    disconnected: null,
    'just-updated': 'TR_QUICK_ACTION_UPDATE_POPOVER_WHATS_NEW',
    'up-to-date': null,
    'update-available': 'TR_QUICK_ACTION_UPDATE_POPOVER_CLICK_TO_START_UPDATE',
    'update-downloaded-auto-restart-to-update':
        'TR_QUICK_ACTION_UPDATE_POPOVER_CLICK_TO_RESTART_AND_UPDATE',
    'update-downloaded-manual': 'TR_QUICK_ACTION_UPDATE_POPOVER_CLICK_TO_START_UPDATE',
};

export const UpdateNotificationBanner = ({
    updateStatusDevice,
    updateStatusSuite,
    onClose,
}: UpdateNotificationBannerProps) => {
    const dispatch = useDispatch();
    const discoveryInProgress = useSelector(selectHasRunningDiscovery);

    const translationHeader =
        updateStatusSuite !== 'up-to-date'
            ? mapSuiteUpdateStatusToHeaderTranslation[updateStatusSuite]
            : mapDeviceUpdateStatusToTranslation[updateStatusDevice];

    const translationCallToAction =
        mapSuiteUpdateStatusToCallToActionTranslation[
            updateStatusSuite !== 'up-to-date' ? updateStatusSuite : updateStatusDevice
        ];

    if (translationHeader === null || translationCallToAction === null || discoveryInProgress) {
        return null;
    }

    const handleOnClick = () => {
        const onClick =
            updateStatusSuite !== 'up-to-date'
                ? mapSuiteUpdateToClick[updateStatusSuite]
                : mapDeviceUpdateToClick[updateStatusDevice];

        if (onClick !== null) {
            onClick({ dispatch });
            onClose();
        }
    };

    return (
        <SidebarBanner
            animate={['drop', 'shake']}
            onClick={handleOnClick}
            onClose={onClose}
            data-testid="@notification/update-notification-banner"
        >
            <Text>
                <Translation id={translationHeader} />
            </Text>
            <Text intent="brand">
                <Translation id={translationCallToAction} />
            </Text>
        </SidebarBanner>
    );
};
