import { useSelector } from 'react-redux';

import { selectSelectedDevice } from '@suite-common/device';
import { getSuiteVersion } from '@trezor/env-utils';
import { versionUtils } from '@trezor/utils';

import { type DesktopUpdateState, UpdateState, selectDesktopUpdate } from '../desktopUpdateReducer';
import { type DesktopUpgradeQuickActionsRootState } from './quickActionsRootState';
import {
    type UpdateStatus,
    type UpdateStatusDevice,
    type UpdateStatusSuite,
} from './updateQuickActionTypes';

type UpdateStatusData = {
    updateStatus: UpdateStatus;
    updateStatusDevice: UpdateStatusDevice;
    updateStatusSuite: UpdateStatusSuite;
};

type GetSuiteUpdateStatusArgs = {
    desktopUpdate: DesktopUpdateState;
};

const getSuiteUpdateStatus = ({ desktopUpdate }: GetSuiteUpdateStatusArgs): UpdateStatusSuite => {
    const isSuiteJustUpdated = desktopUpdate.firstRunAfterUpdate;

    if (isSuiteJustUpdated && !desktopUpdate.justUpdatedInteractedWith) {
        return 'just-updated';
    }

    if (desktopUpdate.isAutomaticUpdateEnabled && desktopUpdate.state === UpdateState.Ready) {
        return 'update-downloaded-auto-restart-to-update';
    }

    if (!desktopUpdate.isAutomaticUpdateEnabled) {
        const isUpdateAvailable = [UpdateState.Available, UpdateState.Downloading].includes(
            desktopUpdate.state,
        );
        if (isUpdateAvailable) {
            return 'update-available';
        }

        if (desktopUpdate.state === UpdateState.Ready) {
            return 'update-downloaded-manual';
        }
    }

    return 'up-to-date';
};

type GetDeviceStatusParams = {
    isDeviceDisconnected: boolean;
    isSuiteUpdateInProgress: boolean;
    isFirmwareOutdated: boolean;
};

const getDeviceStatus = ({
    isDeviceDisconnected,
    isSuiteUpdateInProgress,
    isFirmwareOutdated,
}: GetDeviceStatusParams): UpdateStatusDevice => {
    if (isDeviceDisconnected) {
        return 'disconnected';
    }

    if (isFirmwareOutdated && !isSuiteUpdateInProgress) {
        return 'update-available';
    }

    return 'up-to-date';
};

export const useUpdateStatus = (): UpdateStatusData => {
    const device = useSelector((state: DesktopUpgradeQuickActionsRootState) =>
        selectSelectedDevice(state),
    );
    const desktopUpdate = useSelector((state: DesktopUpgradeQuickActionsRootState) =>
        selectDesktopUpdate(state),
    );

    const isDeviceDisconnected = device?.connected !== true;

    const isSuiteUpdateInProgress = [UpdateState.Downloading, UpdateState.Checking].includes(
        desktopUpdate.state,
    );

    const { releaseConditions: { environment, shouldBeOffered } = {} } =
        device?.firmwareReleaseConfigInfo || {};

    const isValidSuiteVersion =
        !isDeviceDisconnected &&
        !!environment?.min_suite_version &&
        versionUtils.isNewerOrEqual(getSuiteVersion(), environment?.min_suite_version);

    const isFirmwareOutdated =
        isValidSuiteVersion && !!shouldBeOffered && device?.firmware === 'outdated';

    const updateStatusSuite = getSuiteUpdateStatus({ desktopUpdate });

    const updateStatusDevice = getDeviceStatus({
        isDeviceDisconnected,
        isSuiteUpdateInProgress,
        isFirmwareOutdated,
    });

    const common: Omit<UpdateStatusData, 'updateStatus'> = {
        updateStatusDevice,
        updateStatusSuite,
    };

    if (
        common.updateStatusSuite === 'update-downloaded-auto-restart-to-update' ||
        common.updateStatusSuite === 'update-downloaded-manual'
    ) {
        return { updateStatus: common.updateStatusSuite, ...common };
    }

    if (
        common.updateStatusSuite === 'update-available' ||
        common.updateStatusDevice === 'update-available'
    ) {
        return { updateStatus: 'update-available', ...common };
    }

    if (common.updateStatusSuite === 'just-updated') {
        return { updateStatus: 'just-updated', ...common };
    }

    return { updateStatus: 'up-to-date', ...common };
};
