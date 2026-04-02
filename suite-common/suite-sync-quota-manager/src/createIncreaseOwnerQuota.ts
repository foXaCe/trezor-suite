import {
    getProofOfDelegatedIdentity,
    getPublicIdentityKeyFromDelegatedKey,
} from '@suite-common/delegated-identity-key';
import { type EnsureDelegatedIdentityKeyDep } from '@suite-common/delegated-identity-key-types';
import { isTrezorDeviceWithState } from '@suite-common/device';
import { type SuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import {
    type NoQuotaLeftToAllocateErrType,
    type QuotaManagerCommunicationFailedErrType,
} from '@suite-common/suite-sync-types';
import { type TrezorDevice, asDelegatedIdentityKey } from '@suite-common/suite-types';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { type Result, err, ok } from '@trezor/type-utils';

import { type PrepareChallengeSessionDep } from './challenge/prepareChallengeSession';
import {
    DEFAULT_DEVICE_SIZE_QUOTA,
    EVOLU_SIGN_ADD_SPACE_TO_OWNER_REQUEST_HEADER,
} from './constants';
import { quotaManagerCommunicationFailed } from './errors';
import { type TransferStorageDep } from './storage/createTransferStorage';
import { getAccountIncrementSizeQuota } from './util/getAccountIncrementSizeQuota';
import { prepareMessageBufferEvoluAddSpaceToOwner } from './util/prepareMessageBufferEvoluAddSpaceToOwner';

export type IncreaseOwnerQuotaParams = {
    ownerId: SuiteSyncOwnerId;
};

export type IncreaseOwnerQuota = (
    params: IncreaseOwnerQuotaParams,
) => Promise<Result<void, NoQuotaLeftToAllocateErrType | QuotaManagerCommunicationFailedErrType>>;

type GetQuotaManagerBaseUrl = () => string | null;
type GetLeftDeviceQuota = (deviceId: string) => number | undefined;
type GetSelectedDevice = () => TrezorDevice | undefined;

export type IncreaseOwnerQuotaDeps = {
    getQuotaManagerBaseUrl: GetQuotaManagerBaseUrl;
    getLeftDeviceQuota: GetLeftDeviceQuota;
    getSelectedDevice: GetSelectedDevice;
} & EnsureDelegatedIdentityKeyDep &
    TransferStorageDep &
    PrepareChallengeSessionDep;

export type IncreaseOwnerQuotaDep = {
    increaseOwnerQuota: IncreaseOwnerQuota;
};

export const createIncreaseOwnerQuota =
    (deps: IncreaseOwnerQuotaDeps): IncreaseOwnerQuota =>
    async ({ ownerId }) => {
        const device = deps.getSelectedDevice();

        if (!device || !isTrezorDeviceWithState(device)) {
            return ok();
        }

        const { walletDescriptor } = parseDeviceStaticSessionId(device.state.staticSessionId);
        const leftDeviceQuota = deps.getLeftDeviceQuota(device.id);
        const sizeToAllocate = getAccountIncrementSizeQuota({
            unspentStorage: leftDeviceQuota ?? DEFAULT_DEVICE_SIZE_QUOTA,
        });

        if (sizeToAllocate === 0) {
            return err({
                type: 'NoQuotaLeftToAllocate',
            });
        }

        const delegatedKey = await deps.ensureDelegatedIdentityKey({ device });

        if (!delegatedKey.success) {
            return ok();
        }

        const delegatedPublicKey = getPublicIdentityKeyFromDelegatedKey(delegatedKey.payload);

        const sessionChallenge = await deps.prepareChallengeSession({
            baseUrl: deps.getQuotaManagerBaseUrl(),
        });

        if (!sessionChallenge.success) {
            return err(quotaManagerCommunicationFailed(sessionChallenge.error));
        }

        const proof = getProofOfDelegatedIdentity({
            delegatedKey: asDelegatedIdentityKey(delegatedKey.payload),
            header: EVOLU_SIGN_ADD_SPACE_TO_OWNER_REQUEST_HEADER,
            appendMessageBuffer: prepareMessageBufferEvoluAddSpaceToOwner({
                ownerId,
                challenge: sessionChallenge.payload.challenge,
                size: sizeToAllocate,
                publicKey: delegatedPublicKey,
            }),
        });

        if (!proof.success) {
            return err(quotaManagerCommunicationFailed(proof.error));
        }

        const transferStorageResult = await deps.transferStorage({
            deviceId: device.id,
            walletDescriptor,
            params: {
                ownerId,
                size: sizeToAllocate,
                proof: proof.payload,
                sessionId: sessionChallenge.payload.sessionId,
                challenge: sessionChallenge.payload.challenge,
                publicKey: delegatedPublicKey,
            },
        });

        if (!transferStorageResult.success) {
            return err(quotaManagerCommunicationFailed(transferStorageResult.error));
        }

        return ok();
    };
