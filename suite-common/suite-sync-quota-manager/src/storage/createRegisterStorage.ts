import { type Dispatch } from '@reduxjs/toolkit';

import { type Result, ok } from '@trezor/type-utils';

import { quotaManagerDeviceFetched } from '../quotaManagerActions';
import {
    type QuotaManagerFetchCommunicationError,
    type QuotaManagerFetchDep,
} from '../quotaManagerFetch';

export type RegisterStorageParams = {
    publicKey: string;
    size: number;
    proof: string;
    certificateChain: {
        deviceCert: string;
        caCert: string;
    };
    deviceModel: string;
    sessionId: string;
    challenge: string;
};

type RegisterStorageResponse = {
    totalStorageSize: number;
    unspentStorageSize: number;
};

export type RegisterStorage = (
    params: RegisterStorageParams,
) => Promise<Result<RegisterStorageResponse, QuotaManagerFetchCommunicationError>>;

type GetQuotaManagerBaseUrl = () => string | null;

type GetSelectedDevice = () =>
    | {
          id?: string | null;
      }
    | undefined;

export type RegisterStorageDeps = {
    dispatch: Dispatch;
    getQuotaManagerBaseUrl: GetQuotaManagerBaseUrl;
    getSelectedDevice: GetSelectedDevice;
} & QuotaManagerFetchDep;

export type RegisterStorageDep = {
    registerStorage: RegisterStorage;
};

export const createRegisterStorage =
    (deps: RegisterStorageDeps): RegisterStorage =>
    async params => {
        const result = await deps.quotaManagerFetch({
            baseUrl: deps.getQuotaManagerBaseUrl(),
            path: '/storage/register',
            method: 'POST',
            body: params,
        });

        if (!result.success) {
            return result;
        }

        const response = result.payload as RegisterStorageResponse;
        const device = deps.getSelectedDevice();

        if (device?.id !== undefined && device.id !== null) {
            deps.dispatch(
                quotaManagerDeviceFetched({
                    deviceId: device.id,
                    totalStorageSize: response.totalStorageSize,
                    unspentStorageSize: response.unspentStorageSize,
                }),
            );
        }

        return ok(response);
    };
