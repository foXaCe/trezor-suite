import { type Dispatch } from '@reduxjs/toolkit';

import {
    getProofOfDelegatedIdentity,
    getPublicIdentityKeyFromDelegatedKey,
} from '@suite-common/delegated-identity-key';
import {
    type EnsureOwnerHasAllocatedQuota,
    type NoQuotaLeftToAllocateErrType,
    type WriteModeRequiredForAllocationErrType,
} from '@suite-common/suite-sync-types';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { err, ok } from '@trezor/type-utils';

import { type PrepareChallengeSessionDep } from './challenge/prepareChallengeSession';
import {
    DEFAULT_DEVICE_SIZE_QUOTA,
    EVOLU_SIGN_ADD_SPACE_TO_OWNER_REQUEST_HEADER,
} from './constants';
import { quotaManagerCommunicationFailed } from './errors';
import { quotaManagerOwnerFetched } from './quotaManagerActions';
import { type CheckStorageByOwnerIdDep } from './storage/checkStorage';
import { type TransferStorageDep } from './storage/createTransferStorage';
import { getAccountIncrementSizeQuota } from './util/getAccountIncrementSizeQuota';
import { prepareMessageBufferEvoluAddSpaceToOwner } from './util/prepareMessageBufferEvoluAddSpaceToOwner';

export const WriteModeRequiredForAllocation = (): WriteModeRequiredForAllocationErrType => ({
    type: 'WriteModeRequiredForAllocation',
});

export const NoQuotaLeftToAllocate = (): NoQuotaLeftToAllocateErrType => ({
    type: 'NoQuotaLeftToAllocate',
});

type GetQuotaManagerBaseUrl = () => string | null;
type GetLeftDeviceQuota = (deviceId: string) => number | undefined;

export type EnsureOwnerHasAllocatedQuotaDeps = {
    dispatch: Dispatch;
    getQuotaManagerBaseUrl: GetQuotaManagerBaseUrl;
    getLeftDeviceQuota: GetLeftDeviceQuota;
} & TransferStorageDep &
    PrepareChallengeSessionDep &
    CheckStorageByOwnerIdDep;

export type EnsureOwnerHasAllocatedQuotaDep = {
    ensureOwnerHasAllocatedQuota: EnsureOwnerHasAllocatedQuota;
};

export const createEnsureOwnerHasAllocatedQuota =
    (deps: EnsureOwnerHasAllocatedQuotaDeps): EnsureOwnerHasAllocatedQuota =>
    async ({ ownerId, deviceStaticSessionId, delegatedKey, isWriteMode }) => {
        const { walletDescriptor, deviceId } = parseDeviceStaticSessionId(deviceStaticSessionId);

        const hasOwnerStorage = await deps.checkStorageByOwnerId({
            baseUrl: deps.getQuotaManagerBaseUrl(),
            ownerId,
        });

        if (hasOwnerStorage.success) {
            deps.dispatch(
                quotaManagerOwnerFetched({
                    walletDescriptor,
                    totalSpace: hasOwnerStorage.payload.totalSpace ?? 0,
                }),
            );

            return ok();
        }

        const isHttp404 =
            hasOwnerStorage.error.type === 'HttpError' && hasOwnerStorage.error.code === 404;

        if (!isHttp404) {
            return err(quotaManagerCommunicationFailed(hasOwnerStorage.error));
        }

        if (isWriteMode === false) {
            // we want to allocate on-demand
            return err(WriteModeRequiredForAllocation());
        }

        const leftDeviceQuota = deps.getLeftDeviceQuota(deviceId);
        const sizeToAllocate = getAccountIncrementSizeQuota({
            unspentStorage: leftDeviceQuota ?? DEFAULT_DEVICE_SIZE_QUOTA,
        });

        if (sizeToAllocate === 0) {
            return err(NoQuotaLeftToAllocate());
        }

        const sessionChallenge = await deps.prepareChallengeSession({
            baseUrl: deps.getQuotaManagerBaseUrl(),
        });

        if (!sessionChallenge.success) {
            return err(quotaManagerCommunicationFailed(sessionChallenge.error));
        }

        const proofOfDelegatedIdentity = getProofOfDelegatedIdentity({
            delegatedKey,
            header: EVOLU_SIGN_ADD_SPACE_TO_OWNER_REQUEST_HEADER,
            appendMessageBuffer: prepareMessageBufferEvoluAddSpaceToOwner({
                publicKey: getPublicIdentityKeyFromDelegatedKey(delegatedKey),
                ownerId,
                challenge: sessionChallenge.payload.challenge,
                size: sizeToAllocate,
            }),
        });

        if (!proofOfDelegatedIdentity.success) {
            return err(quotaManagerCommunicationFailed(proofOfDelegatedIdentity.error));
        }

        const transferStorageResult = await deps.transferStorage({
            params: {
                ownerId,
                publicKey: getPublicIdentityKeyFromDelegatedKey(delegatedKey),
                proof: proofOfDelegatedIdentity.payload,
                size: sizeToAllocate,
                challenge: sessionChallenge.payload.challenge,
                sessionId: sessionChallenge.payload.sessionId,
            },
            walletDescriptor,
            deviceId,
        });

        if (!transferStorageResult.success) {
            return err(quotaManagerCommunicationFailed(transferStorageResult.error));
        }

        return ok();
    };
