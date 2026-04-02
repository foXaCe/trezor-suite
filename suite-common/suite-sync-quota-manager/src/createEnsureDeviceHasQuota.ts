import { type Dispatch } from '@reduxjs/toolkit';

import {
    getProofOfDelegatedIdentity,
    getPublicIdentityKeyFromDelegatedKey,
} from '@suite-common/delegated-identity-key';
import { type QuotaManagerCommunicationFailedErrType } from '@suite-common/suite-sync-types';
import { type DelegatedIdentityKey, type TrezorDeviceWithState } from '@suite-common/suite-types';
import { type TrezorConnect } from '@trezor/connect';
import { type Result, err, ok } from '@trezor/type-utils';

import { type PrepareChallengeSessionDep } from './challenge/prepareChallengeSession';
import { DEFAULT_DEVICE_SIZE_QUOTA } from './constants';
import { quotaManagerCommunicationFailed } from './errors';
import { quotaManagerDeviceFetched } from './quotaManagerActions';
import { type CheckStorageByPublicKeyDep } from './storage/checkStorage';
import { type RegisterStorageDep } from './storage/createRegisterStorage';
import { prepareMessageBufferEvoluSignRegistrationRequest } from './util/prepareMessageBufferEvoluSignRegistrationRequest';

const EVOLU_SIGN_REGISTRATION_REQUEST_HEADER = 'EvoluSignRegistrationRequest';

export type EnsureDeviceHasQuotaParams = {
    device: TrezorDeviceWithState;
    delegatedKey: DelegatedIdentityKey;
};

export type EnsureDeviceHasQuota = (
    params: EnsureDeviceHasQuotaParams,
) => Promise<Result<void, QuotaManagerCommunicationFailedErrType>>;

type GetQuotaManagerBaseUrl = () => string | null;

export type EnsureDeviceHasQuotaDeps = {
    dispatch: Dispatch;
    getQuotaManagerBaseUrl: GetQuotaManagerBaseUrl;
    trezorConnect: Pick<TrezorConnect, 'evoluSignRegistrationRequest'>;
} & RegisterStorageDep &
    PrepareChallengeSessionDep &
    CheckStorageByPublicKeyDep;

export type EnsureDeviceHasQuotaDep = {
    ensureDeviceHasQuota: EnsureDeviceHasQuota;
};

export const createEnsureDeviceHasQuota =
    (deps: EnsureDeviceHasQuotaDeps): EnsureDeviceHasQuota =>
    async ({ device, delegatedKey }) => {
        const delegatedKeyPublic = getPublicIdentityKeyFromDelegatedKey(delegatedKey);

        const hasPublicKeyStorage = await deps.checkStorageByPublicKey({
            baseUrl: deps.getQuotaManagerBaseUrl(),
            publicKey: delegatedKeyPublic,
        });

        if (hasPublicKeyStorage.success) {
            deps.dispatch(
                quotaManagerDeviceFetched({
                    deviceId: device.id,
                    totalStorageSize: hasPublicKeyStorage.payload.totalSpace,
                    unspentStorageSize: hasPublicKeyStorage.payload.unspentSpace,
                }),
            );

            return ok();
        }

        const isHttp404 =
            hasPublicKeyStorage.error.type === 'HttpError' &&
            hasPublicKeyStorage.error.code === 404;

        if (!isHttp404) {
            return err(quotaManagerCommunicationFailed(hasPublicKeyStorage.error));
        }

        const sessionChallenge = await deps.prepareChallengeSession({
            baseUrl: deps.getQuotaManagerBaseUrl(),
        });

        if (!sessionChallenge.success) {
            return err(quotaManagerCommunicationFailed(sessionChallenge.error));
        }

        const proofOfDelegatedIdentity = getProofOfDelegatedIdentity({
            delegatedKey,
            header: EVOLU_SIGN_REGISTRATION_REQUEST_HEADER,
            appendMessageBuffer: prepareMessageBufferEvoluSignRegistrationRequest({
                challenge: sessionChallenge.payload.challenge,
                size: DEFAULT_DEVICE_SIZE_QUOTA,
            }),
        });

        if (!proofOfDelegatedIdentity.success) {
            return err(quotaManagerCommunicationFailed(proofOfDelegatedIdentity.error));
        }

        const registrationRequestResult = await deps.trezorConnect.evoluSignRegistrationRequest({
            challenge_from_server: sessionChallenge.payload.challenge,
            size_to_acquire: DEFAULT_DEVICE_SIZE_QUOTA,
            proof_of_delegated_identity: proofOfDelegatedIdentity.payload,
        });

        if (!registrationRequestResult.success) {
            return err(quotaManagerCommunicationFailed(registrationRequestResult));
        }

        const registerStorageResult = await deps.registerStorage({
            size: DEFAULT_DEVICE_SIZE_QUOTA,
            certificateChain: {
                deviceCert: registrationRequestResult.payload.certificate_chain[0],
                caCert: registrationRequestResult.payload.certificate_chain[1],
            },
            challenge: sessionChallenge.payload.challenge,
            proof: registrationRequestResult.payload.signature,
            sessionId: sessionChallenge.payload.sessionId,
            deviceModel: device.features.internal_model,
            publicKey: delegatedKeyPublic,
        });

        if (!registerStorageResult.success) {
            return err(quotaManagerCommunicationFailed(registerStorageResult.error));
        }

        return ok();
    };
