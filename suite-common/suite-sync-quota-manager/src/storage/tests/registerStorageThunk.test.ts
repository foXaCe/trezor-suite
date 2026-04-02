import { type Result, err, ok } from '@trezor/type-utils';

import { quotaManagerDeviceFetched } from '../../quotaManagerActions';
import { createRegisterStorage } from '../createRegisterStorage';

const mockDispatch = jest.fn();
const mockQuotaManagerFetch = jest.fn();

const mockedQuotaManagerUrl = 'https://trezor.io/quota-manager';

describe(createRegisterStorage.name, () => {
    const params = {
        publicKey: 'pubkey',
        size: 123,
        proof: 'proof',
        certificateChain: {
            deviceCert: 'deviceCert',
            caCert: 'caCert',
        },
        deviceModel: 'T3T1',
        sessionId: 'sessionId',
        challenge: 'challenge',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('dispatches quotaManagerDeviceFetched on success', async () => {
        mockQuotaManagerFetch.mockResolvedValue(
            ok({
                totalStorageSize: 1000,
                unspentStorageSize: 800,
            }) as Result<unknown, never>,
        );

        const registerStorage = createRegisterStorage({
            dispatch: mockDispatch,
            getQuotaManagerBaseUrl: () => mockedQuotaManagerUrl,
            getSelectedDevice: () => ({ id: 'device-id' }),
            quotaManagerFetch: mockQuotaManagerFetch,
        });
        const result = await registerStorage(params);

        expect(mockQuotaManagerFetch).toHaveBeenCalledWith({
            baseUrl: mockedQuotaManagerUrl,
            path: '/storage/register',
            method: 'POST',
            body: params,
        });

        expect(mockDispatch).toHaveBeenCalledWith(
            quotaManagerDeviceFetched({
                deviceId: 'device-id',
                totalStorageSize: 1000,
                unspentStorageSize: 800,
            }),
        );
        expect(result).toEqual(
            ok({
                totalStorageSize: 1000,
                unspentStorageSize: 800,
            }),
        );
    });

    it('returns fetch errors without dispatching any failure action', async () => {
        mockQuotaManagerFetch.mockResolvedValue(
            err({ type: 'FetchError', message: 'Network error' }),
        );

        const registerStorage = createRegisterStorage({
            dispatch: mockDispatch,
            getQuotaManagerBaseUrl: () => mockedQuotaManagerUrl,
            getSelectedDevice: () => ({ id: 'device-id' }),
            quotaManagerFetch: mockQuotaManagerFetch,
        });
        const result = await registerStorage(params);

        expect(mockDispatch).not.toHaveBeenCalled();
        expect(result).toEqual(err({ type: 'FetchError', message: 'Network error' }));
    });

    it('does not dispatch quotaManagerDeviceFetched if selected device is missing', async () => {
        mockQuotaManagerFetch.mockResolvedValue(
            ok({
                totalStorageSize: 1000,
                unspentStorageSize: 800,
            }) as Result<unknown, never>,
        );

        const registerStorage = createRegisterStorage({
            dispatch: mockDispatch,
            getQuotaManagerBaseUrl: () => mockedQuotaManagerUrl,
            getSelectedDevice: () => undefined,
            quotaManagerFetch: mockQuotaManagerFetch,
        });

        await registerStorage(params);

        expect(mockDispatch).not.toHaveBeenCalledWith(
            expect.objectContaining(quotaManagerDeviceFetched),
        );
    });
});
