import { type AnyAction } from 'redux';
import { type ThunkDispatch } from 'redux-thunk';

import { AppUpdateEventStatus, asTypedDesktopAnalytics, events } from '@suite/analytics';
import { type ExtraDependencies } from '@suite-common/redux-utils';
import { notificationsActions } from '@suite-common/toast-notifications';
import { type UpdateInfo, type UpdateProgress, desktopApi } from '@trezor/suite-desktop-api';

import { getAppUpdatePayload } from './appUpdateAnalytics';
import * as DESKTOP_UPDATE from './desktopUpdateConstants';
import {
    type DesktopUpdateAction,
    type DesktopUpdateRootState,
    UpdateState,
} from './desktopUpdateReducer';

type Dispatch = ThunkDispatch<DesktopUpdateRootState, ExtraDependencies, AnyAction>;
type GetState = () => DesktopUpdateRootState;

export const checking = (): DesktopUpdateAction => ({ type: DESKTOP_UPDATE.CHECKING });

export const available =
    (info: UpdateInfo) => (dispatch: Dispatch, getState: GetState, extra: ExtraDependencies) => {
        // eslint-disable-next-line no-restricted-syntax
        const { allowPrerelease } = getState().desktopUpdate;

        const payload = getAppUpdatePayload({
            status: AppUpdateEventStatus.Available,
            earlyAccessProgram: allowPrerelease,
            updateInfo: info,
        });
        asTypedDesktopAnalytics(extra.services.analytics).report({
            type: events.appUpdateEvent.name,
            payload,
        });

        dispatch({ type: DESKTOP_UPDATE.AVAILABLE, payload: info });
    };

export const notAvailable = (info: UpdateInfo) => (dispatch: Dispatch) => {
    if (info.isManualCheck) {
        dispatch(notificationsActions.addToast({ type: 'auto-updater-no-new' }));
    }

    dispatch({
        type: DESKTOP_UPDATE.NOT_AVAILABLE,
        payload: info,
    });
};

export const download =
    () => (dispatch: Dispatch, getState: GetState, extra: ExtraDependencies) => {
        // eslint-disable-next-line no-restricted-syntax
        const { latest, allowPrerelease } = getState().desktopUpdate;

        const payload = getAppUpdatePayload({
            status: AppUpdateEventStatus.Download,
            earlyAccessProgram: allowPrerelease,
            updateInfo: latest,
        });
        asTypedDesktopAnalytics(extra.services.analytics).report({
            type: events.appUpdateEvent.name,
            payload,
        });

        dispatch({
            type: DESKTOP_UPDATE.DOWNLOAD,
        });
    };

export const downloading = (progress: UpdateProgress): DesktopUpdateAction => ({
    type: DESKTOP_UPDATE.DOWNLOADING,
    payload: progress,
});

export const justUpdated = (): DesktopUpdateAction => ({
    type: DESKTOP_UPDATE.JUST_UPDATED,
});

export const ready =
    (info: UpdateInfo) => (dispatch: Dispatch, getState: GetState, extra: ExtraDependencies) => {
        // eslint-disable-next-line no-restricted-syntax
        const { latest, allowPrerelease } = getState().desktopUpdate;

        const payload = getAppUpdatePayload({
            status: AppUpdateEventStatus.Downloaded,
            earlyAccessProgram: allowPrerelease,
            updateInfo: latest,
        });
        asTypedDesktopAnalytics(extra.services.analytics).report({
            type: events.appUpdateEvent.name,
            payload,
        });
        dispatch({
            type: DESKTOP_UPDATE.READY,
            payload: info,
        });
    };

export const installUpdate =
    ({ installNow }: { installNow: boolean }) =>
    (_: Dispatch, getState: GetState, extra: ExtraDependencies) => {
        // eslint-disable-next-line no-restricted-syntax
        const { desktopUpdate } = getState();

        const payload = getAppUpdatePayload({
            status: installNow
                ? AppUpdateEventStatus.InstallAndRestart
                : AppUpdateEventStatus.InstallOnQuit,
            earlyAccessProgram: desktopUpdate.allowPrerelease,
            updateInfo: desktopUpdate.latest,
            isAutoUpdated: desktopUpdate.isAutomaticUpdateEnabled,
        });

        asTypedDesktopAnalytics(extra.services.analytics).report({
            type: events.appUpdateEvent.name,
            payload,
        });

        if (installNow) {
            desktopApi.installUpdate();
        } else {
            desktopApi.setAutoInstallOnAppQuit();
        }
    };

export const error = () => (dispatch: Dispatch, getState: GetState, extra: ExtraDependencies) => {
    // eslint-disable-next-line no-restricted-syntax
    const { state, latest, allowPrerelease } = getState().desktopUpdate;

    if (state !== UpdateState.Checking) {
        dispatch(notificationsActions.addToast({ type: 'auto-updater-error', state }));

        const payload = getAppUpdatePayload({
            status: AppUpdateEventStatus.Error,
            earlyAccessProgram: allowPrerelease,
            updateInfo: latest,
        });
        asTypedDesktopAnalytics(extra.services.analytics).report({
            type: events.appUpdateEvent.name,
            payload,
        });
    }

    dispatch({
        type: DESKTOP_UPDATE.NOT_AVAILABLE,
    });
};

export const setIsUpdateModalVisible = (isModalVisible: boolean): DesktopUpdateAction => ({
    type: DESKTOP_UPDATE.MODAL_VISIBILITY,
    payload: isModalVisible,
});

export const setIsVersionInfoModalVisible = (isModalVisible: boolean): DesktopUpdateAction => ({
    type: DESKTOP_UPDATE.VERSION_INFO_MODAL_VISIBILITY,
    payload: isModalVisible,
});

export const openEarlyAccessSetup = (earlyAccessEnabled: boolean): DesktopUpdateAction => ({
    type: earlyAccessEnabled
        ? DESKTOP_UPDATE.OPEN_EARLY_ACCESS_DISABLE
        : DESKTOP_UPDATE.OPEN_EARLY_ACCESS_ENABLE,
});

export const allowPrereleaseAction = (allowPrerelease: boolean): DesktopUpdateAction => ({
    type: DESKTOP_UPDATE.ALLOW_PRERELEASE,
    payload: allowPrerelease,
});

export const setAutomaticUpdates = ({
    isEnabled,
}: {
    isEnabled: boolean;
}): DesktopUpdateAction => ({
    type: DESKTOP_UPDATE.SET_AUTOMATIC_UPDATES,
    payload: { isEnabled },
});
