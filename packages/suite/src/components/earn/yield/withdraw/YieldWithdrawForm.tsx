import { Translation } from '@suite/intl';
import { Banner, BulletList, Button, Column, Row, Text } from '@trezor/components';

import { useYieldWithdrawContext } from './useYieldWithdrawContext';
import { YieldActionStep } from '../common/YieldActionStep';
import { YieldActionStepWarning } from '../common/YieldActionStepWarning';
import { YieldApproveModal } from '../common/YieldApproveModal';
import { YieldApproveStep } from '../common/YieldApproveStep';
import { YieldFlowComplete } from '../common/YieldFlowComplete';
import { splitYieldPendingTransaction } from '../yieldFlowUtils';

export const YieldWithdrawForm = () => {
    const {
        account,
        token,
        receiptToken,
        maxAmount,
        approveAmount,
        withdrawAmount,
        completedAmount,
        completedReceiptAmount,
        errorMessage,
        approveModalState,
        pendingTransaction,
        isModifyMode,
        lastApprovedAmount,
        revokeRequired,
        isApproveAmountTooHigh,
        isWithdrawAmountTooHigh,
        isApprovalInsufficient,
        isSubmittingApprove,
        isSubmittingWithdraw,
        setApproveAmount,
        setWithdrawAmount,
        submitApprove,
        submitWithdraw,
        submitRevoke,
        enterModifyApproval,
        handleApproveModalCancel,
        handleApproveSuccessTxid,
        openPendingTransaction,
        flow,
    } = useYieldWithdrawContext();

    const {
        approve: approveStepState,
        action: actionStepState,
        complete: completeStepState,
    } = flow.stepStates;

    const { approvalPendingTransaction, actionPendingTransaction: withdrawPendingTransaction } =
        splitYieldPendingTransaction(pendingTransaction, 'withdraw');

    return (
        <>
            <Column width="100%" alignItems="center">
                <Column gap={24} width="100%" maxWidth={500}>
                    {flow.currentStep === 'complete' ? (
                        <YieldFlowComplete
                            flowType="withdraw"
                            input={{
                                token: receiptToken,
                                amount: completedReceiptAmount,
                            }}
                            output={{
                                token,
                                amount: completedAmount,
                            }}
                        />
                    ) : (
                        <>
                            <Text typographyStyle="headline-md">
                                <Translation id="TR_EARN_YIELD_WITHDRAW" />
                            </Text>

                            {errorMessage && (
                                <Banner
                                    intent="warning"
                                    description={<Translation id={errorMessage} />}
                                />
                            )}

                            <BulletList bulletSize="small" bulletGap={12} gap={24} titleGap={16}>
                                <BulletList.Item
                                    state={approveStepState}
                                    title={
                                        <Row
                                            justifyContent="space-between"
                                            alignItems="center"
                                            width="100%"
                                        >
                                            <Translation id="TR_EARN_YIELD_SELECT_AMOUNT_AND_APPROVE" />
                                            {approveStepState === 'done' && (
                                                <Button
                                                    size="small"
                                                    intent="neutral"
                                                    priority="secondary"
                                                    onClick={enterModifyApproval}
                                                >
                                                    <Translation id="TR_MODIFY" />
                                                </Button>
                                            )}
                                        </Row>
                                    }
                                >
                                    <YieldApproveStep
                                        flowType="withdraw"
                                        token={token}
                                        variant={approveStepState === 'done' ? 'done' : 'active'}
                                        amount={approveAmount}
                                        summaryValue={`${maxAmount} ${token.symbol}`}
                                        approvedAmount={approveAmount}
                                        isModifyMode={isModifyMode}
                                        previousApprovedAmount={lastApprovedAmount || undefined}
                                        revokeRequired={revokeRequired}
                                        warning={
                                            isApproveAmountTooHigh ? (
                                                <YieldActionStepWarning isInsufficientFunds />
                                            ) : undefined
                                        }
                                        isDisabled={
                                            !approveAmount ||
                                            isApproveAmountTooHigh ||
                                            isSubmittingApprove
                                        }
                                        pendingApproveTransaction={approvalPendingTransaction}
                                        onAmountSelect={setApproveAmount}
                                        onMaxClick={() => setApproveAmount(maxAmount)}
                                        onApprove={submitApprove}
                                        onRevokeApproval={submitRevoke}
                                        onPendingTxClick={openPendingTransaction}
                                    />
                                </BulletList.Item>

                                <BulletList.Item
                                    state={actionStepState}
                                    title={<Translation id="TR_EARN_YIELD_WITHDRAW" />}
                                >
                                    {actionStepState === 'active' && (
                                        <YieldActionStep
                                            flowType="withdraw"
                                            token={token}
                                            amount={withdrawAmount}
                                            summaryValue={`${maxAmount} ${token.symbol}`}
                                            warning={
                                                <YieldActionStepWarning
                                                    isInsufficientFunds={isWithdrawAmountTooHigh}
                                                    isApprovalInsufficient={isApprovalInsufficient}
                                                    onModifyApproval={enterModifyApproval}
                                                />
                                            }
                                            isDisabled={
                                                isWithdrawAmountTooHigh ||
                                                isApprovalInsufficient ||
                                                isSubmittingWithdraw
                                            }
                                            pendingTransaction={withdrawPendingTransaction}
                                            onAmountSelect={setWithdrawAmount}
                                            onMaxClick={() => setWithdrawAmount(maxAmount)}
                                            onSubmit={submitWithdraw}
                                            onPendingTxClick={openPendingTransaction}
                                        />
                                    )}
                                </BulletList.Item>

                                <BulletList.Item
                                    state={completeStepState}
                                    title={<Translation id="TR_EARN_YIELD_WITHDRAW_COMPLETE" />}
                                />
                            </BulletList>
                        </>
                    )}
                </Column>
            </Column>

            {approveModalState && (
                <YieldApproveModal
                    {...approveModalState}
                    account={account}
                    onCancel={handleApproveModalCancel}
                    onSuccessTxid={handleApproveSuccessTxid}
                />
            )}
        </>
    );
};
