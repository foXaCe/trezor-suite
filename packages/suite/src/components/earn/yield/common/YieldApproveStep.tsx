import type { ReactNode } from 'react';

import { Translation } from '@suite/intl';
import type { YieldFlowType } from '@suite-common/suite-types';
import { tokenSupportsIncreasingAllowance } from '@suite-common/trading';
import { Button, Column } from '@trezor/components';
import { BigNumber } from '@trezor/utils';

import { YieldAmountCard } from './YieldAmountCard';
import { YieldApprovedAmountCard } from './YieldApprovedAmountCard';
import { YieldPendingTransaction } from './YieldPendingTransaction';
import type { YieldFlowDisplayToken, YieldPendingTransactionState } from '../types';

const approveStepTranslationMap = {
    supply: {
        amountLabelTranslationId: 'TR_EARN_YIELD_AMOUNT_TO_SUPPLY',
        balanceLabelTranslationId: 'TR_BALANCE',
    },
    withdraw: {
        amountLabelTranslationId: 'TR_EARN_YIELD_AMOUNT_TO_WITHDRAW',
        balanceLabelTranslationId: 'TR_EARN_YIELD_SUPPLIED',
    },
} as const;

export type YieldApproveStepProps = {
    flowType: YieldFlowType;
    token: YieldFlowDisplayToken;
    variant: 'active' | 'done';
    amount: string;
    summaryValue: string;
    isDisabled?: boolean;
    approvedAmount?: string;
    isModifyMode?: boolean;
    previousApprovedAmount?: string;
    revokeRequired?: boolean;
    warning?: ReactNode;
    pendingApproveTransaction?: YieldPendingTransactionState;
    onAmountSelect: (amount: string) => void;
    onMaxClick?: () => void;
    onApprove?: () => void | Promise<void>;
    onRevokeApproval?: () => void | Promise<void>;
    onPendingTxClick?: (txid: string) => void;
};

export const YieldApproveStep = ({
    flowType,
    token,
    variant,
    amount,
    summaryValue,
    isDisabled = false,
    approvedAmount,
    isModifyMode = false,
    previousApprovedAmount,
    revokeRequired = false,
    warning,
    pendingApproveTransaction,
    onAmountSelect,
    onMaxClick,
    onApprove,
    onRevokeApproval,
    onPendingTxClick,
}: YieldApproveStepProps) => {
    const { amountLabelTranslationId, balanceLabelTranslationId } =
        approveStepTranslationMap[flowType];
    const normalizedPreviousApprovedAmount = previousApprovedAmount || '0';

    const hasPreviousApprovedAmount =
        !!previousApprovedAmount && !new BigNumber(normalizedPreviousApprovedAmount).isZero();
    const isAmountChanged =
        isModifyMode &&
        hasPreviousApprovedAmount &&
        !new BigNumber(amount || '0').eq(normalizedPreviousApprovedAmount);
    const isIncreasing =
        isModifyMode &&
        hasPreviousApprovedAmount &&
        new BigNumber(amount || '0').gt(normalizedPreviousApprovedAmount);
    const needsZeroApprovalReset =
        !!token.contractAddress && !tokenSupportsIncreasingAllowance(token.contractAddress);
    const shouldRevokeApproval =
        isModifyMode && (revokeRequired || (isAmountChanged && needsZeroApprovalReset));
    let approveButtonId:
        | 'TR_EARN_YIELD_REVOKE_APPROVAL'
        | 'TR_EARN_YIELD_INCREASE_APPROVAL'
        | 'TR_APPROVE_DATA_TITLE';

    if (shouldRevokeApproval) {
        approveButtonId = 'TR_EARN_YIELD_REVOKE_APPROVAL';
    } else if (isModifyMode && isIncreasing) {
        approveButtonId = 'TR_EARN_YIELD_INCREASE_APPROVAL';
    } else {
        approveButtonId = 'TR_APPROVE_DATA_TITLE';
    }
    const onApproveButtonClick = shouldRevokeApproval ? onRevokeApproval : onApprove;

    return (
        <>
            {variant === 'active' && (
                <Column gap={16}>
                    {previousApprovedAmount && (
                        <YieldApprovedAmountCard
                            token={token}
                            amount={previousApprovedAmount}
                            onRevoke={onRevokeApproval}
                        />
                    )}

                    <YieldAmountCard
                        amount={amount}
                        tokenSymbol={token.symbol}
                        summary={{
                            labelTranslationId: balanceLabelTranslationId,
                            value: summaryValue,
                            onMaxClick: pendingApproveTransaction ? undefined : onMaxClick,
                        }}
                        heading={{
                            amountLabelTranslationId,
                        }}
                        warning={warning}
                        isDisabled={!!pendingApproveTransaction}
                        onAmountChange={onAmountSelect}
                    />

                    <Button
                        size="large"
                        width="100%"
                        onClick={
                            onApproveButtonClick
                                ? () => {
                                      void onApproveButtonClick();
                                  }
                                : undefined
                        }
                        isDisabled={
                            isDisabled || !!pendingApproveTransaction || !onApproveButtonClick
                        }
                    >
                        <Translation id={approveButtonId} />
                    </Button>

                    {pendingApproveTransaction && (
                        <YieldPendingTransaction
                            pendingTransaction={pendingApproveTransaction}
                            onTxClick={onPendingTxClick}
                        />
                    )}
                </Column>
            )}

            {variant === 'done' && approvedAmount && (
                <YieldApprovedAmountCard token={token} amount={approvedAmount} />
            )}
        </>
    );
};
