import { type TooltipProps } from 'recharts';

import { type Formatters, useFormatters } from '@suite-common/formatters';
import { type SignOperator } from '@suite-common/suite-types';
import { type NetworkSymbol } from '@suite-common/wallet-config';
import { type BaseCurrencyAmount } from '@suite-common/wallet-types';
import { Row } from '@trezor/components';
import { spacings } from '@trezor/theme';

import { FormattedCryptoAmount } from 'src/components/suite/FormattedCryptoAmount';
import type { CryptoGraphProps } from 'src/components/suite/graph/types';
import { type CommonAggregatedHistory, type GraphRange } from 'src/types/wallet/graph';

import { GraphTooltipBase } from './GraphTooltipBase';

const formatAmount = (
    amount: string | undefined,
    symbol: NetworkSymbol,
    fiatAmount: BaseCurrencyAmount | undefined,
    localCurrency: string | undefined,
    sign: SignOperator,
    formatters: Formatters,
) => {
    const { BaseCurrencyAmountFormatter } = formatters;

    return (
        <Row>
            {amount && (
                <Row margin={{ right: spacings.xxs }}>
                    <FormattedCryptoAmount
                        value={amount}
                        symbol={symbol}
                        signValue={sign}
                        disableHiddenPlaceholder
                    />
                </Row>
            )}

            {fiatAmount && localCurrency && (
                <>
                    (
                    <BaseCurrencyAmountFormatter currency={localCurrency} value={fiatAmount} />)
                </>
            )}
        </Row>
    );
};

interface GraphTooltipAccountProps extends TooltipProps<number, any> {
    selectedRange: GraphRange;
    localCurrency: string;
    symbol: NetworkSymbol;
    sentValueFn: CryptoGraphProps['sentValueFn'];
    receivedValueFn: CryptoGraphProps['receivedValueFn'];
    balanceValueFn: CryptoGraphProps['balanceValueFn'];
    onShow?: (index: number) => void;
    extendedDataForInterval?: CommonAggregatedHistory[];
}

export const GraphTooltipAccount = ({
    active,
    balanceValueFn,
    receivedValueFn,
    sentValueFn,
    payload,
    localCurrency,
    symbol,
    ...props
}: GraphTooltipAccountProps) => {
    const formatters = useFormatters();

    // Note: payload is [] when discovery is paused.
    const firstPayload = payload?.[0];
    if (!active || !firstPayload) {
        return null;
    }

    const balance = balanceValueFn(firstPayload.payload);
    const receivedAmountString = receivedValueFn(firstPayload.payload);
    const sentAmountString = sentValueFn(firstPayload.payload);

    const receivedFiat: BaseCurrencyAmount | undefined =
        firstPayload.payload.receivedFiat[localCurrency] ?? undefined;
    const sentFiat: BaseCurrencyAmount | undefined =
        firstPayload.payload.sentFiat[localCurrency] ?? undefined;

    return (
        <GraphTooltipBase
            {...props}
            active={active}
            payload={payload}
            sentAmount={formatAmount(
                sentAmountString,
                symbol,
                sentFiat,
                localCurrency,
                'negative',
                formatters,
            )}
            receivedAmount={formatAmount(
                receivedAmountString,
                symbol,
                receivedFiat,
                localCurrency,
                'positive',
                formatters,
            )}
            balance={
                <FormattedCryptoAmount
                    disableHiddenPlaceholder
                    value={balance as string}
                    symbol={symbol}
                />
            }
        />
    );
};
