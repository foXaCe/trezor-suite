/**
 * QuotaManager API services / functions.
 */
export { createPrepareChallengeSession } from './challenge/prepareChallengeSession';
export { createCheckStorageByOwnerId, createCheckStorageByPublicKey } from './storage/checkStorage';
export { quotaManagerFetch } from './quotaManagerFetch';
export { createRegisterStorage } from './storage/createRegisterStorage';
export type { RegisterStorage, RegisterStorageDep } from './storage/createRegisterStorage';
export { createTransferStorage } from './storage/createTransferStorage';
export type { TransferStorage, TransferStorageDep } from './storage/createTransferStorage';
export type { QuotaManagerFetch, QuotaManagerFetchDep } from './quotaManagerFetch';
export { createEnsureDeviceHasQuota } from './createEnsureDeviceHasQuota';
export type { EnsureDeviceHasQuota, EnsureDeviceHasQuotaDep } from './createEnsureDeviceHasQuota';
export {
    createEnsureOwnerHasAllocatedQuota,
    NoQuotaLeftToAllocate,
    WriteModeRequiredForAllocation,
} from './createEnsureOwnerHasAllocatedQuota';
export type { EnsureOwnerHasAllocatedQuotaDep } from './createEnsureOwnerHasAllocatedQuota';
export { createIncreaseOwnerQuota } from './createIncreaseOwnerQuota';
export type { IncreaseOwnerQuota, IncreaseOwnerQuotaDep } from './createIncreaseOwnerQuota';
export type { EnsureQuotaDep } from './createEnsureQuota';
export { createSuiteSyncQuotaManagerCompositionRoot } from './createSuiteSyncQuotaManagerCompositionRoot';
export type { GetOwnerHasAllowanceDep } from './getOwnerHasAllowance';

/**
 * Actions.
 */
export {
    updateQuotaManagerBaseUrl,
    quotaManagerDeviceFetched,
    suiteSyncQuotaManagerActions,
    eraseFetchedData,
    noQuotaLeftWarningDismissed,
    enforceQuotaManagerUpdated,
} from './quotaManagerActions';

/**
 * Selectors.
 */
export {
    selectQuotaManagerBaseUrl,
    selectOwnersAllowance,
    selectRegisteredDevices,
    selectIsDeviceRegistered,
    selectHasOwnerAllowance,
    selectHasDeviceAllowance,
    selectLeftDeviceQuota,
    selectDeviceDismissedNoQuotaLeftWarning,
    selectShouldDisplayOutOfQuotaAlert,
    selectEnforceQuotaManager,
} from './quotaManagerSelectors';
export type { WithSuiteSyncQuotaManagerState } from './quotaManagerSelectors';

/**
 * Reducers.
 */
export {
    suiteSyncQuotaManagerReducer,
    quotaManagerInitialState,
    type SuiteSyncQuotaManagerState,
} from './quotaManagerReducer';

/**
 * Constants.
 */
export { DEFAULT_DEVICE_SIZE_QUOTA } from './constants';

export { getAccountIncrementSizeQuota } from './util/getAccountIncrementSizeQuota';
