import { type Result, err, ok } from '@trezor/type-utils';

import {
    type QuotaManagerFetchCommunicationError,
    type QuotaManagerFetchDep,
} from '../quotaManagerFetch';

type AskForStorageResponse = {
    totalSpace: number;
};

type AskForStoragePublicKeyResponse = AskForStorageResponse & {
    unspentSpace: number;
};

export type CheckStorageByPublicKeyParams = {
    baseUrl: string | null;
    publicKey: string;
};

export type CheckStorageByOwnerIdParams = {
    baseUrl: string | null;
    ownerId: string;
};

export type CheckStorageByPublicKey = (
    params: CheckStorageByPublicKeyParams,
) => Promise<Result<AskForStoragePublicKeyResponse, QuotaManagerFetchCommunicationError>>;

export type CheckStorageByOwnerId = (
    params: CheckStorageByOwnerIdParams,
) => Promise<Result<AskForStorageResponse, QuotaManagerFetchCommunicationError>>;

export type CheckStorageByPublicKeyDep = {
    checkStorageByPublicKey: CheckStorageByPublicKey;
};

export type CheckStorageByOwnerIdDep = {
    checkStorageByOwnerId: CheckStorageByOwnerId;
};

/**
 * Ask quota manager for storage allowance by public key.
 * Returns also unspent space left.
 */
export const createCheckStorageByPublicKey =
    (deps: QuotaManagerFetchDep): CheckStorageByPublicKey =>
    async ({ baseUrl, publicKey }) => {
        const result = await deps.quotaManagerFetch({
            baseUrl,
            path: '/storage/ask',
            method: 'POST',
            body: { publicKey },
        });

        if (!result.success) {
            return err(result.error);
        }

        return ok(result.payload as AskForStoragePublicKeyResponse);
    };

/**
 * Ask quota manager for storage allowance by owner ID.
 */
export const createCheckStorageByOwnerId =
    (deps: QuotaManagerFetchDep): CheckStorageByOwnerId =>
    async ({ baseUrl, ownerId }) => {
        const result = await deps.quotaManagerFetch({
            baseUrl,
            path: '/storage/ask',
            method: 'POST',
            body: { ownerId },
        });

        if (!result.success) {
            return err(result.error);
        }

        return ok(result.payload as AskForStorageResponse);
    };
