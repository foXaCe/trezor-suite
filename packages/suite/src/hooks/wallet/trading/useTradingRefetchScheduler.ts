import { useEffect, useRef } from 'react';

import {
    INVITY_API_RELOAD_QUOTES_AFTER_SECONDS,
    selectTradingRefetchInterval,
} from '@suite-common/trading';

import { useSelector } from 'src/hooks/suite';

export const useTradingRefetchScheduler = (onRefetch: () => void, onBeforeRefetch?: () => void) => {
    const { lastFetchTimestamp, status } = useSelector(selectTradingRefetchInterval);
    const onRefetchRef = useRef(onRefetch);
    onRefetchRef.current = onRefetch;
    const onBeforeRefetchRef = useRef(onBeforeRefetch);
    onBeforeRefetchRef.current = onBeforeRefetch;

    useEffect(() => {
        if (status !== 'running' || !lastFetchTimestamp) return;
        const id = setTimeout(() => {
            onBeforeRefetchRef.current?.();
            onRefetchRef.current();
        }, INVITY_API_RELOAD_QUOTES_AFTER_SECONDS * 1000);

        return () => clearTimeout(id);
    }, [lastFetchTimestamp, status]);
};
