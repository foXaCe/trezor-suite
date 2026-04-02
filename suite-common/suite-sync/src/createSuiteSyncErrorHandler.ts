import {
    type CreateSuiteSyncErrorHandlerDep,
    type Errors,
    type SuiteSyncErrorHandler,
} from '@suite-common/suite-sync-types';

export const createSuiteSyncErrorHandler =
    (deps: CreateSuiteSyncErrorHandlerDep): SuiteSyncErrorHandler =>
    (error: Errors) => {
        switch (error.type) {
            case 'RelayQuotaExceeded':
                void deps.increaseOwnerQuota({ ownerId: error.ownerId });

                return;

            default:
                console.error('SuiteSync relay error', error.message);

                return;
        }
    };
