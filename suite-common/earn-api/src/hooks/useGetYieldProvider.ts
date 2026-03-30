import { desktopQueryKeys, useQuery } from '@suite-common/react-query';

import { getProvider } from '../api';
import { EARN_QUERY_STALE_TIME } from '../config';

/**
 * Provider metadata for a yield provider ID.
 * @url https://docs.yield.xyz/reference/providerscontroller_getprovider
 */
export const useGetYieldProvider = (providerId?: string) =>
    useQuery({
        enabled: Boolean(providerId),
        queryKey: desktopQueryKeys.yieldProvider(providerId),
        queryFn: () => getProvider({ providerId: providerId! }),
        staleTime: EARN_QUERY_STALE_TIME,
    });
