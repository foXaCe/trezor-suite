import { DELEGATED_IDENTITY_KEY } from '@suite-common/delegated-identity-key-types/mocks';
import { createMockDeps } from '@suite-common/dependency-injection';
import { type TrezorDeviceWithState } from '@suite-common/suite-types';
import { mockSuiteDevice } from '@suite-common/suite-types/mocks';
import TrezorConnect from '@trezor/connect';
import { DeviceModelInternal } from '@trezor/device-utils';
import { err, ok } from '@trezor/type-utils';

import { DEFAULT_DEVICE_SIZE_QUOTA } from '../constants';
import {
    type EnsureDeviceHasQuotaDeps,
    createEnsureDeviceHasQuota,
} from '../createEnsureDeviceHasQuota';

const device = mockSuiteDevice(
    { id: 'device-id' },
    { internal_model: DeviceModelInternal.T2T1 },
) as TrezorDeviceWithState;

const prepareChallengeSessionMock = jest.fn();
const checkStorageByPublicKeyMock = jest.fn();
let evoluSignRegistrationRequestSpy: jest.SpyInstance;

describe(createEnsureDeviceHasQuota.name, () => {
    beforeEach(() => {
        jest.clearAllMocks();

        if (!evoluSignRegistrationRequestSpy) {
            evoluSignRegistrationRequestSpy = jest.spyOn(
                TrezorConnect,
                'evoluSignRegistrationRequest',
            );
        }

        evoluSignRegistrationRequestSpy.mockReset();
    });

    afterAll(() => {
        evoluSignRegistrationRequestSpy?.mockRestore();
    });

    const createDeps = (patch: Partial<EnsureDeviceHasQuotaDeps> = {}) =>
        createMockDeps<EnsureDeviceHasQuotaDeps>({
            checkStorageByPublicKey: checkStorageByPublicKeyMock,
            dispatch: jest.fn(),
            getQuotaManagerBaseUrl: () => 'https://quota-manager.test',
            prepareChallengeSession: prepareChallengeSessionMock,
            registerStorage: () =>
                Promise.resolve(ok({ totalStorageSize: 5000, unspentStorageSize: 1200 })),
            trezorConnect: {
                evoluSignRegistrationRequest: TrezorConnect.evoluSignRegistrationRequest,
            },
            ...patch,
        });

    it('dispatches device fetched when storage already exists', async () => {
        const deps = createDeps();

        checkStorageByPublicKeyMock.mockResolvedValue(ok({ totalSpace: 5000, unspentSpace: 1200 }));

        const result = await createEnsureDeviceHasQuota(deps)({
            delegatedKey: DELEGATED_IDENTITY_KEY,
            device,
        });

        expect(result).toEqual(ok());
        expect(checkStorageByPublicKeyMock).toHaveBeenCalledWith({
            baseUrl: 'https://quota-manager.test',
            publicKey:
                '0428a3cefc19b41ff56795e371aab72d6d85a3ca2200bd46c54e611a36222295a88b44d6f23ce94025b6010f9eb0f9168ad35d8396dc865fa0a16f2f5471816a45',
        });
        expect(deps.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: '@suite/quota-manager/deviceFetched',
                payload: {
                    deviceId: 'device-id',
                    totalStorageSize: 5000,
                    unspentStorageSize: 1200,
                },
            }),
        );
        expect(prepareChallengeSessionMock).not.toHaveBeenCalled();
        expect(deps.registerStorage).not.toHaveBeenCalled();
    });

    it('returns QuotaManagerCommunicationFailed for non-404 failures', async () => {
        const deps = createDeps();

        checkStorageByPublicKeyMock.mockResolvedValue(
            err({ type: 'HttpError', code: 500, message: 'Internal error' }),
        );

        const result = await createEnsureDeviceHasQuota(deps)({
            delegatedKey: DELEGATED_IDENTITY_KEY,
            device,
        });

        expect(result).toEqual(
            err({
                type: 'QuotaManagerCommunicationFailed',
                caused: { type: 'HttpError', code: 500, message: 'Internal error' },
            }),
        );
        expect(prepareChallengeSessionMock).not.toHaveBeenCalled();
    });

    it('requests registration when storage is missing', async () => {
        const deps = createDeps();

        checkStorageByPublicKeyMock.mockResolvedValue(
            err({ type: 'HttpError', code: 404, message: 'Not Found' }),
        );
        prepareChallengeSessionMock.mockResolvedValue(
            ok({ sessionId: 'session-123', challenge: 'aa55' }),
        );
        evoluSignRegistrationRequestSpy.mockResolvedValue({
            success: true,
            payload: {
                certificate_chain: ['device-cert', 'ca-cert'],
                signature: 'device-signature',
            },
        });

        const result = await createEnsureDeviceHasQuota(deps)({
            delegatedKey: DELEGATED_IDENTITY_KEY,
            device,
        });

        expect(result).toEqual(ok());
        expect(prepareChallengeSessionMock).toHaveBeenCalledWith({
            baseUrl: 'https://quota-manager.test',
        });
        expect(evoluSignRegistrationRequestSpy).toHaveBeenCalledWith({
            challenge_from_server: 'aa55',
            size_to_acquire: DEFAULT_DEVICE_SIZE_QUOTA,
            proof_of_delegated_identity:
                '9d40167d8ec7ce7949f1675d60a4d5c2a6ec5f16152bdc6c7959af99c856d31570c0d262996917cf424a3e638a7ee10b57aa2864c06895b0728d09f040496177',
        });
        expect(deps.registerStorage).toHaveBeenCalledWith({
            size: DEFAULT_DEVICE_SIZE_QUOTA,
            certificateChain: {
                deviceCert: 'device-cert',
                caCert: 'ca-cert',
            },
            challenge: 'aa55',
            proof: 'device-signature',
            sessionId: 'session-123',
            deviceModel: 'T2T1',
            publicKey:
                '0428a3cefc19b41ff56795e371aab72d6d85a3ca2200bd46c54e611a36222295a88b44d6f23ce94025b6010f9eb0f9168ad35d8396dc865fa0a16f2f5471816a45',
        });
    });
});
