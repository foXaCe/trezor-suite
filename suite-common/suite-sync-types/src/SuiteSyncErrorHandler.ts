import { type Dispatch } from '@reduxjs/toolkit';

import { type SuiteSyncOwnerId } from '@suite-common/suite-sync-storage';

export type IncreaseOwnerQuota = (params: { ownerId: SuiteSyncOwnerId }) => Promise<unknown>;

export type CreateSuiteSyncErrorHandlerDep = {
    dispatch?: Dispatch;
    increaseOwnerQuota: IncreaseOwnerQuota;
};

export type RelayQuotaExceededError = { type: 'RelayQuotaExceeded'; ownerId: SuiteSyncOwnerId };
export type SuiteSyncOtherError = { type: 'RelayOther'; message: string };

export type Errors = RelayQuotaExceededError | SuiteSyncOtherError;

export type SuiteSyncErrorHandler = (error: Errors) => void;
