import { type QuotaManagerCommunicationFailedErrType } from '@suite-common/suite-sync-types';

export const quotaManagerCommunicationFailed = (
    caused: unknown,
): QuotaManagerCommunicationFailedErrType => ({
    type: 'QuotaManagerCommunicationFailed',
    caused,
});
