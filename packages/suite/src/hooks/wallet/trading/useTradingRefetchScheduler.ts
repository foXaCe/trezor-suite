import { useEffect, useRef } from 'react';

import {
    INVITY_API_RELOAD_QUOTES_AFTER_SECONDS,
    selectTradingRefetchQuotes,
} from '@suite-common/trading';

import { useSelector } from 'src/hooks/suite';

type UseTradingRefetchSchedulerProps = {
    onRefetch: () => void;
    onBeforeRefetch?: () => void;
};

export const useTradingRefetchScheduler = ({
    onRefetch,
    onBeforeRefetch,
}: UseTradingRefetchSchedulerProps) => {
    const { lastFetchTimestamp, status } = useSelector(selectTradingRefetchQuotes);
    const onRefetchRef = useRef(onRefetch);
    onRefetchRef.current = onRefetch;
    const onBeforeRefetchRef = useRef(onBeforeRefetch);
    onBeforeRefetchRef.current = onBeforeRefetch;

    useEffect(() => {
        if (status !== 'running' || !lastFetchTimestamp) return;
        const elapsed = Date.now() - lastFetchTimestamp;
        const delay = Math.max(INVITY_API_RELOAD_QUOTES_AFTER_SECONDS * 1000 - elapsed, 0);
        const id = setTimeout(() => {
            onBeforeRefetchRef.current?.();
            onRefetchRef.current();
        }, delay);

        return () => clearTimeout(id);
    }, [lastFetchTimestamp, status]);
};
