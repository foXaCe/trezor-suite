import { type Dispatch } from '@reduxjs/toolkit';

import { type EnsureDelegatedIdentityKeyDep } from '@suite-common/delegated-identity-key-types';
import { selectSelectedDevice } from '@suite-common/device';
import { type TrezorConnect } from '@trezor/connect';

import { createPrepareChallengeSession } from './challenge/prepareChallengeSession';
import { createEnsureDeviceHasQuota } from './createEnsureDeviceHasQuota';
import { createEnsureOwnerHasAllocatedQuota } from './createEnsureOwnerHasAllocatedQuota';
import { createEnsureQuota } from './createEnsureQuota';
import { createIncreaseOwnerQuota } from './createIncreaseOwnerQuota';
import { type GetDeviceForStaticSessionIdDep } from './getDeviceForStaticSessionId';
import { type GetDeviceHasAllowance } from './getDeviceHasAllowance';
import { type GetIsUsingTrezorRelayDep } from './getIsDefaultRelayUrlSet';
import { type GetIsQuotaManagerEnabled } from './getIsQuotaManagerEnabled';
import { type GetOwnerHasAllowance } from './getOwnerHasAllowance';
import { type QuotaManagerFetchDep } from './quotaManagerFetch';
import {
    type WithSuiteSyncQuotaManagerState,
    selectEnforceQuotaManager,
    selectHasDeviceAllowance,
    selectHasOwnerAllowance,
    selectLeftDeviceQuota,
    selectQuotaManagerBaseUrl,
} from './quotaManagerSelectors';
import { createCheckStorageByOwnerId, createCheckStorageByPublicKey } from './storage/checkStorage';
import { createRegisterStorage } from './storage/createRegisterStorage';
import { createTransferStorage } from './storage/createTransferStorage';
import { generateSessionId } from './util/generateSessionId';

type CreateSuiteSyncQuotaManagerCompositionRootDeps = {
    dispatch: Dispatch;
    getState: () => WithSuiteSyncQuotaManagerState & Parameters<typeof selectSelectedDevice>[0];
} & GetDeviceForStaticSessionIdDep &
    GetIsUsingTrezorRelayDep &
    EnsureDelegatedIdentityKeyDep & {
        trezorConnect: Pick<TrezorConnect, 'evoluSignRegistrationRequest'>;
    } & QuotaManagerFetchDep;

export const createSuiteSyncQuotaManagerCompositionRoot = (
    deps: CreateSuiteSyncQuotaManagerCompositionRootDeps,
) => {
    // We only want to use QM for our own relay servers. In case custom URL has been set, QM is ignored,
    // unless enforceQuotaManager is set (used for e2e tests with a local relay).
    const getIsQuotaManagerEnabled: GetIsQuotaManagerEnabled = () =>
        deps.getIsUsingTrezorRelay() || selectEnforceQuotaManager(deps.getState());

    const getDeviceHasAllowance: GetDeviceHasAllowance = (deviceId, walletDescriptor) =>
        !getIsQuotaManagerEnabled() ||
        selectHasDeviceAllowance(deps.getState(), deviceId, walletDescriptor);

    const getOwnerHasAllowance: GetOwnerHasAllowance = walletDescriptor =>
        !getIsQuotaManagerEnabled() || selectHasOwnerAllowance(deps.getState(), walletDescriptor);

    const getQuotaManagerBaseUrl = () => selectQuotaManagerBaseUrl(deps.getState());
    const getSelectedDevice = () => selectSelectedDevice(deps.getState());
    const getLeftDeviceQuota = (deviceId: string) =>
        selectLeftDeviceQuota(deps.getState(), deviceId);
    const prepareChallengeSession = createPrepareChallengeSession({
        generateSessionId,
        quotaManagerFetch: deps.quotaManagerFetch,
    });
    const checkStorageByPublicKey = createCheckStorageByPublicKey({
        quotaManagerFetch: deps.quotaManagerFetch,
    });
    const checkStorageByOwnerId = createCheckStorageByOwnerId({
        quotaManagerFetch: deps.quotaManagerFetch,
    });

    const registerStorage = createRegisterStorage({
        dispatch: deps.dispatch,
        getQuotaManagerBaseUrl,
        getSelectedDevice,
        quotaManagerFetch: deps.quotaManagerFetch,
    });

    const transferStorage = createTransferStorage({
        dispatch: deps.dispatch,
        getQuotaManagerBaseUrl,
        quotaManagerFetch: deps.quotaManagerFetch,
    });

    const ensureDeviceHasQuota = createEnsureDeviceHasQuota({
        checkStorageByPublicKey,
        dispatch: deps.dispatch,
        getQuotaManagerBaseUrl,
        prepareChallengeSession,
        registerStorage,
        trezorConnect: deps.trezorConnect,
    });

    const ensureOwnerHasAllocatedQuota = createEnsureOwnerHasAllocatedQuota({
        checkStorageByOwnerId,
        dispatch: deps.dispatch,
        getLeftDeviceQuota,
        getQuotaManagerBaseUrl,
        prepareChallengeSession,
        transferStorage,
    });

    const ensureQuota = createEnsureQuota({
        ensureDeviceHasQuota,
        ensureOwnerHasAllocatedQuota,
        getDeviceForStaticSessionId: deps.getDeviceForStaticSessionId,
        getDeviceHasAllowance,
    });

    const increaseOwnerQuota = createIncreaseOwnerQuota({
        ensureDelegatedIdentityKey: deps.ensureDelegatedIdentityKey,
        getLeftDeviceQuota,
        getQuotaManagerBaseUrl,
        getSelectedDevice,
        prepareChallengeSession,
        transferStorage,
    });

    return {
        ensureQuota,
        getDeviceHasAllowance,
        getOwnerHasAllowance,
        increaseOwnerQuota,
    };
};
