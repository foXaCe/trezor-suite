import { useEffect } from 'react';

import { goto } from '@suite/router';

import { YieldPageHeader, YieldWithdraw } from 'src/components/earn';
import { useEarnRouteAccount } from 'src/components/earn/utils/useEarnRouteAccount';
import { useDispatch, useLayout } from 'src/hooks/suite';

export const EarnWithdraw = () => {
    const dispatch = useDispatch();
    const { account, routeParams } = useEarnRouteAccount();

    useEffect(() => {
        if (!routeParams) {
            dispatch(goto({ routeName: 'suite-earn' }));
        }
    }, [dispatch, routeParams]);

    useLayout(
        'Earn',
        <YieldPageHeader
            analyticsStep="yield-withdraw"
            account={account}
            routeParams={routeParams}
        />,
    );

    if (!account || !routeParams) {
        return null;
    }

    return <YieldWithdraw account={account} routeParams={routeParams} />;
};
