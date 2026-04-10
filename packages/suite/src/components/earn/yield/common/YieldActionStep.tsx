import type { ReactNode } from 'react';

import { Translation } from '@suite/intl';
import type { YieldFlowType } from '@suite-common/suite-types';
import { Button, Column } from '@trezor/components';

import { YieldAmountCard } from './YieldAmountCard';
import { YieldPendingTransaction } from './YieldPendingTransaction';
import type { YieldFlowDisplayToken, YieldPendingTransactionState } from '../types';

const actionStepTranslationMap = {
    supply: {
        amountLabelTranslationId: 'TR_EARN_YIELD_AMOUNT_TO_SUPPLY',
        submitTranslationId: 'TR_EARN_YIELD_SUPPLY',
        balanceLabelTranslationId: 'TR_BALANCE',
    },
    withdraw: {
        amountLabelTranslationId: 'TR_EARN_YIELD_AMOUNT_TO_WITHDRAW',
        submitTranslationId: 'TR_EARN_YIELD_WITHDRAW',
        balanceLabelTranslationId: 'TR_EARN_YIELD_SUPPLIED',
    },
} as const;

export type YieldActionStepProps = {
    flowType: YieldFlowType;
    token: YieldFlowDisplayToken;
    amount: string;
    summaryValue: string;
    isDisabled?: boolean;
    warning?: ReactNode;
    pendingTransaction?: YieldPendingTransactionState;
    onAmountSelect: (amount: string) => void;
    onMaxClick?: () => void;
    onSubmit: () => void | Promise<void>;
    onPendingTxClick?: (txid: string) => void;
};

export const YieldActionStep = ({
    flowType,
    token,
    amount,
    summaryValue,
    isDisabled = false,
    warning,
    pendingTransaction,
    onAmountSelect,
    onMaxClick,
    onSubmit,
    onPendingTxClick,
}: YieldActionStepProps) => {
    const { amountLabelTranslationId, submitTranslationId, balanceLabelTranslationId } =
        actionStepTranslationMap[flowType];

    return (
        <Column gap={16}>
            <YieldAmountCard
                amount={amount}
                tokenSymbol={token.symbol}
                summary={{
                    labelTranslationId: balanceLabelTranslationId,
                    value: summaryValue,
                    onMaxClick: pendingTransaction ? undefined : onMaxClick,
                }}
                heading={{
                    amountLabelTranslationId,
                }}
                warning={warning}
                isDisabled={!!pendingTransaction}
                onAmountChange={onAmountSelect}
            />

            <Button
                size="large"
                width="100%"
                onClick={() => {
                    void onSubmit();
                }}
                isDisabled={isDisabled || !!pendingTransaction}
            >
                <Translation id={submitTranslationId} />
            </Button>

            {pendingTransaction && (
                <YieldPendingTransaction
                    pendingTransaction={pendingTransaction}
                    onTxClick={onPendingTxClick}
                />
            )}
        </Column>
    );
};
