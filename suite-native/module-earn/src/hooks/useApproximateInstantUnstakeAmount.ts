import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { type AccountsRootState, selectAccountByKey } from '@suite-common/wallet-core';
import { type AccountKey } from '@suite-common/wallet-types';
import { isSupportedEthStakingNetworkSymbol } from '@suite-common/wallet-utils';
import { simulateUnstakeNative } from '@suite-native/staking';
import { BigNumber } from '@trezor/utils';

const DEBOUNCE_MS = 300;

export const useApproximateInstantUnstakeAmount = (accountKey: AccountKey, amount: string) => {
    const account = useSelector((state: AccountsRootState) =>
        selectAccountByKey(state, accountKey),
    );
    const descriptor = account?.descriptor;
    const symbol = account?.symbol;

    const [approximatedAmount, setApproximatedAmount] = useState<string | null>(null);

    useEffect(() => {
        if (!descriptor || !symbol || !isSupportedEthStakingNetworkSymbol(symbol)) {
            setApproximatedAmount(null);

            return;
        }

        if (!amount || new BigNumber(amount).lte(0)) {
            setApproximatedAmount(null);

            return;
        }

        let cancelled = false;

        const timeoutId = setTimeout(async () => {
            try {
                const result = await simulateUnstakeNative({ amount, from: descriptor, symbol });
                if (cancelled) return;
                setApproximatedAmount(result ?? null);
            } catch (error) {
                if (cancelled) return;
                if (__DEV__) {
                    console.warn('simulateUnstakeNative failed', error);
                }
                setApproximatedAmount(null);
            }
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [accountKey, amount, descriptor, symbol]);

    return approximatedAmount;
};
