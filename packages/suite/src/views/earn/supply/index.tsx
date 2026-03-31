import { useEffect } from 'react';

import { goto } from '@suite/router';

import { YieldPageHeader, YieldSupply } from 'src/components/earn';
import { useEarnRouteAccount } from 'src/components/earn/utils/useEarnRouteAccount';
import { useDispatch, useLayout } from 'src/hooks/suite';

export const EarnSupply = () => {
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
            analyticsStep="yield-supply"
            account={account}
            routeParams={routeParams}
        />,
    );

    if (!account || !routeParams) {
        return null;
    }

    return <YieldSupply account={account} routeParams={routeParams} />;
};
