import { memo, useCallback, useEffect } from 'react';

import styled from 'styled-components';

import { Translation } from '@suite/intl';
import { selectSelectedDevice } from '@suite-common/device';
import { Box, Button } from '@trezor/components';
import { typography } from '@trezor/theme';

import { updateGraphData } from 'src/actions/wallet/graphActions';
import { HiddenPlaceholder } from 'src/components/suite';
import { useDispatch, useGraph, useSelector } from 'src/hooks/suite';
import { useIsContentBelowBreakpoint } from 'src/support/suite/ContentFlex';
import { type AppState } from 'src/types/suite';
import { type Account } from 'src/types/wallet';

import { DashboardLiveFiatGraph } from './DashboardLiveFiatGraph';

const Wrapper = styled.div`
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
`;

const GraphWrapper = styled(HiddenPlaceholder)`
    display: flex;
    flex: 1 1 auto;
    padding: 16px 0;
    height: 320px;
`;

const ErrorMessage = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 20px;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.textSubdued};
    ${typography['body-sm']}
    text-align: center;
`;

type DashboardGraphProps = {
    accounts: Account[];
    isLive: boolean;
};

const areGraphAccountsEqual = (previousAccounts: Account[], nextAccounts: Account[]) => {
    if (previousAccounts.length !== nextAccounts.length) {
        return false;
    }

    return previousAccounts.every((account, index) => {
        const nextAccount = nextAccounts[index];

        return (
            account.key === nextAccount.key &&
            account.symbol === nextAccount.symbol &&
            account.descriptor === nextAccount.descriptor &&
            account.deviceState === nextAccount.deviceState &&
            account.backendType === nextAccount.backendType &&
            account.visible === nextAccount.visible &&
            account.formattedBalance === nextAccount.formattedBalance
        );
    });
};

const selectGraph = (state: AppState) => state.wallet.graph;

export const DashboardGraph = memo(
    ({ accounts, isLive }: DashboardGraphProps) => {
        const graph = useSelector(selectGraph);
        const selectedDevice = useSelector(selectSelectedDevice);
        const dispatch = useDispatch();
        const { selectedRange } = useGraph();
        const isContentBelowBreakpoint = useIsContentBelowBreakpoint();

        const selectedDeviceState = selectedDevice?.state?.staticSessionId;
        const failedAccounts = graph.error?.filter(a => a.deviceState === selectedDeviceState);
        const allFailed =
            failedAccounts !== undefined &&
            accounts.every(a => failedAccounts.some(fa => fa.descriptor === a.descriptor));

        const onRefresh = useCallback(
            () => dispatch(updateGraphData({ accounts })).unwrap(),
            [accounts, dispatch],
        );

        useEffect(() => {
            dispatch(
                updateGraphData({
                    accounts,
                    selectedRange,
                }),
            );
        }, [accounts, dispatch, selectedRange]);

        return (
            <Wrapper data-testid="@dashboard/graph">
                <GraphWrapper>
                    {allFailed ? (
                        <ErrorMessage>
                            <Translation id="TR_COULD_NOT_RETRIEVE_DATA" />
                            <Button
                                onClick={onRefresh}
                                iconLeft="repeat"
                                intent="neutral"
                                priority="secondary"
                            >
                                <Translation id="TR_RETRY" />
                            </Button>
                        </ErrorMessage>
                    ) : (
                        <Box
                            margin={
                                isContentBelowBreakpoint
                                    ? undefined
                                    : { vertical: 12, horizontal: 20 }
                            }
                            width="100%"
                            height="100%"
                        >
                            <DashboardLiveFiatGraph accounts={accounts} isLive={isLive} />
                        </Box>
                    )}
                </GraphWrapper>
            </Wrapper>
        );
    },
    (previousProps, nextProps) => {
        if (previousProps.isLive !== nextProps.isLive) {
            return false;
        }

        return areGraphAccountsEqual(previousProps.accounts, nextProps.accounts);
    },
);
