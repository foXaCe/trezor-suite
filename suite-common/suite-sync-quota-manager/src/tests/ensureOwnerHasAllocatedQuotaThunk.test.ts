import { DELEGATED_IDENTITY_KEY } from '@suite-common/delegated-identity-key-types/mocks';
import { createMockDeps } from '@suite-common/dependency-injection';
import { asSuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import { type WalletDescriptor, asWalletDescriptor } from '@suite-common/wallet-types';
import { type StaticSessionId } from '@trezor/connect';
import { err, ok } from '@trezor/type-utils';

import { DEFAULT_ACCOUNT_SIZE_QUOTA } from '../constants';
import {
    type EnsureOwnerHasAllocatedQuotaDeps,
    createEnsureOwnerHasAllocatedQuota,
} from '../createEnsureOwnerHasAllocatedQuota';

const ownerId = asSuiteSyncOwnerId('owner-id');
const walletDescriptor: WalletDescriptor = asWalletDescriptor('descriptor');
const deviceId = 'device-123';
const deviceStaticSessionId = `${walletDescriptor}@${deviceId}` as StaticSessionId;

const prepareChallengeSessionMock = jest.fn();
const checkStorageByOwnerIdMock = jest.fn();

describe(createEnsureOwnerHasAllocatedQuota.name, () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createDeps = (patch: Partial<EnsureOwnerHasAllocatedQuotaDeps> = {}) =>
        createMockDeps<EnsureOwnerHasAllocatedQuotaDeps>({
            checkStorageByOwnerId: checkStorageByOwnerIdMock,
            dispatch: jest.fn(),
            getLeftDeviceQuota: () => undefined,
            getQuotaManagerBaseUrl: () => 'https://quota-manager.test',
            prepareChallengeSession: prepareChallengeSessionMock,
            transferStorage: () =>
                Promise.resolve(
                    ok({
                        ownerTotalSpace: DEFAULT_ACCOUNT_SIZE_QUOTA,
                        publicKeyUnspentSpace: 0,
                    }),
                ),
            ...patch,
        });

    it('dispatches owner fetched when storage already exists', async () => {
        const deps = createDeps();

        checkStorageByOwnerIdMock.mockResolvedValue(ok({ totalSpace: 2048 }));

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            delegatedKey: DELEGATED_IDENTITY_KEY,
            deviceStaticSessionId,
            isWriteMode: false,
        });

        expect(result).toEqual(ok());
        expect(checkStorageByOwnerIdMock).toHaveBeenCalledWith({
            baseUrl: 'https://quota-manager.test',
            ownerId,
        });
        expect(deps.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: '@suite/quota-manager/ownerFetched',
                payload: {
                    walletDescriptor,
                    totalSpace: 2048,
                },
            }),
        );
        expect(prepareChallengeSessionMock).not.toHaveBeenCalled();
        expect(deps.transferStorage).not.toHaveBeenCalled();
    });

    it("does not attempt allocation when no quota is left and returns 'NoQuotaLeftToAllocate'", async () => {
        const deps = createDeps({
            getLeftDeviceQuota: () => 0,
        });

        checkStorageByOwnerIdMock.mockResolvedValue(
            err({ type: 'HttpError', code: 404, message: 'Not Found' }),
        );

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            delegatedKey: DELEGATED_IDENTITY_KEY,
            deviceStaticSessionId,
            isWriteMode: true,
        });

        expect(result).toEqual(err({ type: 'NoQuotaLeftToAllocate' }));
        expect(prepareChallengeSessionMock).not.toHaveBeenCalled();
        expect(deps.transferStorage).not.toHaveBeenCalled();
    });

    it('returns QuotaManagerCommunicationFailed for non-404 storage lookup failures', async () => {
        const deps = createDeps();

        checkStorageByOwnerIdMock.mockResolvedValue(
            err({ type: 'HttpError', code: 500, message: 'Internal error' }),
        );

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            delegatedKey: DELEGATED_IDENTITY_KEY,
            deviceStaticSessionId,
            isWriteMode: false,
        });

        expect(result).toEqual(
            err({
                type: 'QuotaManagerCommunicationFailed',
                caused: { type: 'HttpError', code: 500, message: 'Internal error' },
            }),
        );
        expect(prepareChallengeSessionMock).not.toHaveBeenCalled();
    });

    it('requests storage transfer when owner storage is missing', async () => {
        const deps = createDeps();

        checkStorageByOwnerIdMock.mockResolvedValue(
            err({ type: 'HttpError', code: 404, message: 'Not Found' }),
        );
        prepareChallengeSessionMock.mockResolvedValue(
            ok({ sessionId: 'session-123', challenge: 'aa55' }),
        );

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            delegatedKey: DELEGATED_IDENTITY_KEY,
            deviceStaticSessionId,
            isWriteMode: true,
        });

        expect(result).toEqual(ok());
        expect(prepareChallengeSessionMock).toHaveBeenCalledWith({
            baseUrl: 'https://quota-manager.test',
        });
        expect(deps.transferStorage).toHaveBeenCalledWith({
            params: {
                ownerId,
                publicKey:
                    '0428a3cefc19b41ff56795e371aab72d6d85a3ca2200bd46c54e611a36222295a88b44d6f23ce94025b6010f9eb0f9168ad35d8396dc865fa0a16f2f5471816a45',
                proof: '2944ed0b226eb961750433b65639366871cf05a10dfd598a0651a39e18e5ada578f76fda26478316ac93115b1538bbad11044b83a59259efa8c2f9feaba1675b',
                size: DEFAULT_ACCOUNT_SIZE_QUOTA,
                challenge: 'aa55',
                sessionId: 'session-123',
            },
            walletDescriptor,
            deviceId,
        });
    });

    it('allocates only the remaining quota when it is below the default increment', async () => {
        const remainingQuota = 500;
        const deps = createDeps({
            getLeftDeviceQuota: () => remainingQuota,
        });

        checkStorageByOwnerIdMock.mockResolvedValue(
            err({ type: 'HttpError', code: 404, message: 'Not Found' }),
        );
        prepareChallengeSessionMock.mockResolvedValue(
            ok({ sessionId: 'session-456', challenge: 'bb66' }),
        );

        await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            delegatedKey: DELEGATED_IDENTITY_KEY,
            deviceStaticSessionId,
            isWriteMode: true,
        });

        expect(deps.transferStorage).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    size: remainingQuota,
                }),
            }),
        );
    });
});
