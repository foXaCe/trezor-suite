import { memo, useEffect, useMemo, useState } from 'react';

import { selectFlags, setFlag } from '@suite/flags';
import { Translation } from '@suite/intl';
import { getCoingeckoId, getNetwork } from '@suite-common/wallet-config';
import {
    selectAllAccountsToList,
    selectBaseCurrency,
    selectCurrentFiatRates,
    selectEnabledNetworks,
} from '@suite-common/wallet-core';
import { isAccountFailed } from '@suite-common/wallet-utils';
import {
    Box,
    Button,
    Card,
    Collapsible,
    Column,
    Divider,
    Icon,
    Paragraph,
    Row,
} from '@trezor/components';

import { DashboardSection } from 'src/components/dashboard';
import { GraphRangeSelector, GraphSkeleton } from 'src/components/suite';
import { useDevice, useDiscovery, useDispatch, useSelector } from 'src/hooks/suite';
import { useTotalFiatBalance } from 'src/hooks/wallet/useTotalFiatBalance';
import { type AppState } from 'src/types/suite';
import { isNetworkWithGraphFeature } from 'src/utils/wallet/graph';
import { selectDiscoveryOverallStatus } from 'src/utils/wallet/selectDiscoveryOverallStatus';

import { DashboardGraph } from './DashboardGraph';
import { EmptyWallet } from './EmptyWallet';
import { hasCoinbaseLiveSupport } from './LiveFiatGraph';
import { PortfolioCardException } from './PortfolioCardException';
import { PortfolioCardHeader } from './PortfolioCardHeader';
import { UnsupportedAssetsMessage, useUnsupportedNetworkMessage } from './UnsupportedAssetsMessage';

const MarginContainer = ({ children }: { children: React.ReactNode }) => (
    <Box margin={{ horizontal: 24, vertical: 16 }}>{children}</Box>
);

const selectGraphIsLoading = (state: AppState) => state.wallet.graph.isLoading;

export const PortfolioCard = memo(() => {
    const currentFiatRates = useSelector(selectCurrentFiatRates);
    const baseCurrencyCode = useSelector(selectBaseCurrency);
    const isGraphLoading = useSelector(selectGraphIsLoading);
    const { discovery, isDiscoveryRunning } = useDiscovery();
    const discoveryStatus = useSelector(selectDiscoveryOverallStatus);
    const enabledNetworks = useSelector(selectEnabledNetworks);

    const accounts = useSelector(selectAllAccountsToList);
    const { dashboardGraphHidden } = useSelector(selectFlags);
    const dispatch = useDispatch();
    const { device } = useDevice();
    const [isLive, setIsLive] = useState(false);
    const isDeviceEmpty = useMemo(() => accounts.every(a => a.empty), [accounts]);
    const failedAccounts = useMemo(() => accounts.filter(isAccountFailed), [accounts]);
    const walletBalance = useTotalFiatBalance(accounts, baseCurrencyCode, currentFiatRates);

    const passphraseEntryCanceled = accounts.length === 0 && discoveryStatus === undefined;

    const graphEligibleAccounts = useMemo(
        () =>
            accounts.filter(
                account =>
                    account.visible &&
                    enabledNetworks.includes(account.symbol) &&
                    !!getCoingeckoId(account.symbol) &&
                    isNetworkWithGraphFeature(account.symbol, account.backendType),
            ),
        [accounts, enabledNetworks],
    );
    const hasNetworkWithEnabledGraph = graphEligibleAccounts.length > 0;
    const hasAnyDashboardLiveSupport = graphEligibleAccounts.some(account =>
        hasCoinbaseLiveSupport(account.symbol),
    );
    const hasPartialDashboardLiveSupport =
        hasAnyDashboardLiveSupport &&
        graphEligibleAccounts.some(account => !hasCoinbaseLiveSupport(account.symbol));
    const unsupportedLiveNetworksLabel = useMemo(
        () =>
            Array.from(
                new Set(
                    graphEligibleAccounts
                        .filter(account => !hasCoinbaseLiveSupport(account.symbol))
                        .map(account => getNetwork(account.symbol).name),
                ),
            ).join(', '),
        [graphEligibleAccounts],
    );

    const isGraphAvailable = hasNetworkWithEnabledGraph;
    const isGraphCollapsed = dashboardGraphHidden && isGraphAvailable;

    useEffect(() => {
        if (!hasAnyDashboardLiveSupport && isLive) {
            setIsLive(false);
        }
    }, [hasAnyDashboardLiveSupport, isLive]);

    // TODO: DashboardGraph will get mounted twice (thus triggering data processing twice)
    // 1. DashboardGraph gets mounted
    // 2. Discovery starts, DashboardGraph is unmounted, Loading mounts
    // 3. Discovery stops (no accounts added), Loading unmounted, new instance of DashboardGraph gets mounted

    let body = null;
    if (discoveryStatus && discoveryStatus.status === 'exception') {
        body = (
            <MarginContainer>
                <PortfolioCardException
                    exception={discoveryStatus}
                    discovery={discovery}
                    failed={failedAccounts}
                />
            </MarginContainer>
        );
    } else if (passphraseEntryCanceled) {
        body = (
            <MarginContainer>
                <PortfolioCardException
                    exception={{
                        status: 'exception',
                        type: 'discovery-failed',
                    }}
                    discovery={discovery}
                    failed={failedAccounts}
                />
            </MarginContainer>
        );
    } else if (discoveryStatus && discoveryStatus.status === 'loading') {
        body = !isGraphAvailable ? null : (
            <MarginContainer>
                <Column height={320}>
                    <GraphSkeleton data-testid="@dashboard/loading" />
                </Column>
            </MarginContainer>
        );
    } else if (isDeviceEmpty) {
        body = (
            <MarginContainer>
                <EmptyWallet />
            </MarginContainer>
        );
    } else if (isGraphAvailable) {
        body = <DashboardGraph accounts={graphEligibleAccounts} isLive={isLive} />;
    }

    const isWalletEmpty = !discoveryStatus && isDeviceEmpty;
    const isWalletLoading = discoveryStatus?.status === 'loading';
    const isWalletError = discoveryStatus?.status === 'exception';
    const showGraphControls =
        !isWalletEmpty && !isWalletLoading && !isWalletError && isGraphAvailable;
    const canToggleGraph = !isWalletEmpty && !isWalletError && isGraphAvailable;
    const { affectedNetworks, hasTokens, showMissingDataTooltip } = useUnsupportedNetworkMessage({
        showGraphControls,
        device,
        accounts,
        isGraphHidden: isGraphCollapsed || !isGraphAvailable,
    });

    const heading = <Translation id="TR_MY_PORTFOLIO" />;

    const headerRightContent = canToggleGraph ? (
        <Button
            size="medium"
            intent="neutral"
            priority="secondary"
            iconRight={dashboardGraphHidden ? 'caretDown' : 'caretUp'}
            onClick={() =>
                dispatch(
                    setFlag({
                        key: 'dashboardGraphHidden',
                        value: !dashboardGraphHidden,
                    }),
                )
            }
        >
            <Translation id={dashboardGraphHidden ? 'TR_SHOW_GRAPH' : 'TR_HIDE_GRAPH'} />
        </Button>
    ) : null;

    const header =
        discovery && discoveryStatus?.status === 'exception' ? null : (
            <PortfolioCardHeader
                discovery={discovery}
                fiatAmount={walletBalance}
                localCurrency={baseCurrencyCode}
                isDiscoveryRunning={isDiscoveryRunning}
                rightContent={headerRightContent}
            />
        );

    return (
        <DashboardSection heading={heading}>
            <Collapsible isOpen={canToggleGraph ? !dashboardGraphHidden : true}>
                <Card paddingType="none">
                    {header}
                    {body && (
                        <Collapsible.Content overflow="unset">
                            {header && <Divider margin={{}} />}
                            <Column justifyContent="center" minHeight={329}>
                                {body}
                            </Column>
                            {showGraphControls && (
                                <Row padding={24} justifyContent="space-between" gap={24}>
                                    <GraphRangeSelector
                                        isLive={isLive}
                                        isLoading={isGraphLoading}
                                        onLiveChange={setIsLive}
                                        showLiveOption={hasAnyDashboardLiveSupport}
                                        liveTooltipContent={
                                            hasPartialDashboardLiveSupport
                                                ? `Live data is unavailable for: ${unsupportedLiveNetworksLabel}.`
                                                : undefined
                                        }
                                    />
                                    {!isGraphCollapsed && showMissingDataTooltip && (
                                        <Row gap={12}>
                                            <Paragraph
                                                typographyStyle="body-xs"
                                                intent="neutral"
                                                priority="secondary"
                                                align="end"
                                                textWrap="balance"
                                                maxWidth={400}
                                            >
                                                <UnsupportedAssetsMessage
                                                    affectedNetworks={affectedNetworks}
                                                    hasTokens={hasTokens}
                                                />
                                            </Paragraph>
                                            <Icon
                                                name="info"
                                                size={24}
                                                intent="neutral"
                                                priority="secondary"
                                            />
                                        </Row>
                                    )}
                                </Row>
                            )}
                        </Collapsible.Content>
                    )}
                </Card>
            </Collapsible>
        </DashboardSection>
    );
});
