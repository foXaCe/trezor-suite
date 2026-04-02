import type { Dispatch } from '@reduxjs/toolkit';

import { type SuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import { type WalletDescriptor } from '@suite-common/wallet-types';
import { type Result, ok } from '@trezor/type-utils';

import {
    quotaManagerDeviceUnspentStorageFetched,
    quotaManagerOwnerFetched,
} from '../quotaManagerActions';
import {
    type QuotaManagerFetchCommunicationError,
    type QuotaManagerFetchDep,
} from '../quotaManagerFetch';

type TransferStorageBody = {
    publicKey: string;
    ownerId: SuiteSyncOwnerId;
    size: number;
    challenge: string;
    sessionId: string;
    proof: string;
};

type TransferStorageResponse = {
    publicKeyUnspentSpace: number | null;
    ownerTotalSpace: number | null;
};

export type TransferStorageParams = {
    params: TransferStorageBody;
    walletDescriptor: WalletDescriptor;
    deviceId?: string;
};

export type TransferStorage = (
    params: TransferStorageParams,
) => Promise<Result<TransferStorageResponse, QuotaManagerFetchCommunicationError>>;

type GetQuotaManagerBaseUrl = () => string | null;

export type TransferStorageDeps = {
    dispatch: Dispatch;
    getQuotaManagerBaseUrl: GetQuotaManagerBaseUrl;
} & QuotaManagerFetchDep;

export type TransferStorageDep = {
    transferStorage: TransferStorage;
};

export const createTransferStorage =
    (deps: TransferStorageDeps): TransferStorage =>
    async ({ params, walletDescriptor, deviceId }) => {
        const result = await deps.quotaManagerFetch({
            baseUrl: deps.getQuotaManagerBaseUrl(),
            path: '/storage/add',
            method: 'POST',
            body: params,
        });

        if (!result.success) {
            return result;
        }

        const response = result.payload as TransferStorageResponse;

        deps.dispatch(
            quotaManagerOwnerFetched({
                walletDescriptor,
                totalSpace: response.ownerTotalSpace ?? 0,
            }),
        );

        if (deviceId !== undefined && response.publicKeyUnspentSpace !== null) {
            deps.dispatch(
                quotaManagerDeviceUnspentStorageFetched({
                    deviceId,
                    unspentStorageSize: response.publicKeyUnspentSpace,
                }),
            );
        }

        return ok(response);
    };
