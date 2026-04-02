import { createMockDeps } from '@suite-common/dependency-injection';
import {
    type SuiteSyncOwner,
    asSuiteSyncOwnerId,
    asSuiteSyncOwnerSecretHex,
} from '@suite-common/suite-sync-storage';
import { asDelegatedIdentityKey } from '@suite-common/suite-types';
import { mockSuiteDevice } from '@suite-common/suite-types/mocks';
import { type StaticSessionId } from '@trezor/connect';
import { err, ok } from '@trezor/type-utils';

import { type EnsureQuotaDeps, createEnsureQuota } from '../createEnsureQuota';

const OWNER_ABCD: SuiteSyncOwner = {
    ownerId: asSuiteSyncOwnerId('owner-id-abcd'),
    ownerSecret: asSuiteSyncOwnerSecretHex('owner-secret-abcd'),
};

const DELEGATED_KEY = asDelegatedIdentityKey('delegated-key-abcd');

const deviceStaticSessionId: StaticSessionId = '1@device-id:3';

const DEFAULT_PARAMS = {
    deviceStaticSessionId,
    delegatedKey: DELEGATED_KEY,
    owner: OWNER_ABCD,
    isWriteMode: false,
};

const device = mockSuiteDevice({
    id: 'device-id',
    state: { staticSessionId: deviceStaticSessionId },
});

describe(createEnsureQuota.name, () => {
    it.each([
        {
            description: 'device is not found',
            getDevice: () => null,
        },
        {
            description: 'device has no id',
            getDevice: () => mockSuiteDevice({ id: undefined } as never),
        },
    ])('returns ok without calling services when $description', async ({ getDevice }) => {
        const deps = createMockDeps<EnsureQuotaDeps>({
            ensureDeviceHasQuota: () => Promise.resolve(ok()),
            ensureOwnerHasAllocatedQuota: () => Promise.resolve(ok()),
            getDeviceHasAllowance: () => false,
            getDeviceForStaticSessionId: () => getDevice(),
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(ok());
        expect(deps.ensureDeviceHasQuota).not.toHaveBeenCalled();
        expect(deps.ensureOwnerHasAllocatedQuota).not.toHaveBeenCalled();
    });

    it('returns ok without calling services when allowance is granted', async () => {
        const deps = createMockDeps<EnsureQuotaDeps>({
            ensureDeviceHasQuota: () => Promise.resolve(ok()),
            ensureOwnerHasAllocatedQuota: () => Promise.resolve(ok()),
            getDeviceHasAllowance: () => true,
            getDeviceForStaticSessionId: () => device,
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(ok());
        expect(deps.ensureDeviceHasQuota).not.toHaveBeenCalled();
        expect(deps.ensureOwnerHasAllocatedQuota).not.toHaveBeenCalled();
    });

    it('calls both quota services when allowance is not granted', async () => {
        const deps = createMockDeps<EnsureQuotaDeps>({
            ensureDeviceHasQuota: () => Promise.resolve(ok()),
            ensureOwnerHasAllocatedQuota: () => Promise.resolve(ok()),
            getDeviceHasAllowance: () => false,
            getDeviceForStaticSessionId: () => device,
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(ok());
        expect(deps.ensureDeviceHasQuota).toHaveBeenCalledWith({
            delegatedKey: DELEGATED_KEY,
            device,
        });
        expect(deps.ensureOwnerHasAllocatedQuota).toHaveBeenCalledWith({
            delegatedKey: DELEGATED_KEY,
            deviceStaticSessionId,
            isWriteMode: false,
            ownerId: OWNER_ABCD.ownerId,
        });
    });

    it('returns WriteModeRequiredForAllocation when owner allocation fails with that error', async () => {
        const deps = createMockDeps<EnsureQuotaDeps>({
            ensureDeviceHasQuota: () => Promise.resolve(ok()),
            ensureOwnerHasAllocatedQuota: () =>
                Promise.resolve(err({ type: 'WriteModeRequiredForAllocation' })),
            getDeviceHasAllowance: () => false,
            getDeviceForStaticSessionId: () => device,
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(err({ type: 'WriteModeRequiredForAllocation' }));
    });

    it('returns owner allocation errors other than WriteModeRequiredForAllocation directly', async () => {
        const deps = createMockDeps<EnsureQuotaDeps>({
            ensureDeviceHasQuota: () => Promise.resolve(ok()),
            ensureOwnerHasAllocatedQuota: () =>
                Promise.resolve(err({ type: 'NoQuotaLeftToAllocate' })),
            getDeviceHasAllowance: () => false,
            getDeviceForStaticSessionId: () => device,
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(err({ type: 'NoQuotaLeftToAllocate' }));
    });

    it('returns QuotaManagerCommunicationFailed when device registration fails', async () => {
        const deps = createMockDeps<EnsureQuotaDeps>({
            ensureDeviceHasQuota: () =>
                Promise.resolve(
                    err({
                        type: 'QuotaManagerCommunicationFailed',
                        caused: { type: 'HttpError', code: 500 },
                    }),
                ),
            ensureOwnerHasAllocatedQuota: () => Promise.resolve(ok()),
            getDeviceHasAllowance: () => false,
            getDeviceForStaticSessionId: () => device,
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(
            err({
                type: 'QuotaManagerCommunicationFailed',
                caused: { type: 'HttpError', code: 500 },
            }),
        );
        expect(deps.ensureOwnerHasAllocatedQuota).not.toHaveBeenCalled();
    });

    it('uses the current allowance state when deciding whether to call services', async () => {
        let hasDeviceAllowance = false;

        const deps = createMockDeps<EnsureQuotaDeps>({
            ensureDeviceHasQuota: () => Promise.resolve(ok()),
            ensureOwnerHasAllocatedQuota: () => Promise.resolve(ok()),
            getDeviceHasAllowance: () => hasDeviceAllowance,
            getDeviceForStaticSessionId: () => device,
        });

        hasDeviceAllowance = true;

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(ok());
        expect(deps.ensureDeviceHasQuota).not.toHaveBeenCalled();
        expect(deps.ensureOwnerHasAllocatedQuota).not.toHaveBeenCalled();
    });
});
