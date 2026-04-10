import { Translation } from '@suite/intl';
import { Banner, BulletList, Button, Column, Row, Text } from '@trezor/components';

import { useYieldSupplyContext } from './useYieldSupplyContext';
import { YieldActionStep } from '../common/YieldActionStep';
import { YieldActionStepWarning } from '../common/YieldActionStepWarning';
import { YieldApproveModal } from '../common/YieldApproveModal';
import { YieldApproveStep } from '../common/YieldApproveStep';
import { YieldFlowComplete } from '../common/YieldFlowComplete';
import { splitYieldPendingTransaction } from '../yieldFlowUtils';

export const YieldSupplyForm = () => {
    const {
        account,
        token,
        receiptToken,
        apy,
        approveAmount,
        supplyAmount,
        completedAmount,
        completedReceiptAmount,
        maxAmount,
        errorMessage,
        approveModalState,
        pendingTransaction,
        isModifyMode,
        lastApprovedAmount,
        revokeRequired,
        isApproveAmountTooHigh,
        isSupplyAmountTooHigh,
        isApprovalInsufficient,
        isSubmittingApprove,
        isSubmittingSupply,
        setApproveAmount,
        setSupplyAmount,
        submitApprove,
        submitSupply,
        submitRevoke,
        enterModifyApproval,
        handleApproveModalCancel,
        handleApproveSuccessTxid,
        openPendingTransaction,
        flow,
    } = useYieldSupplyContext();

    const {
        approve: approveStepState,
        action: actionStepState,
        complete: completeStepState,
    } = flow.stepStates;

    const { approvalPendingTransaction, actionPendingTransaction: supplyPendingTransaction } =
        splitYieldPendingTransaction(pendingTransaction, 'supply');

    return (
        <>
            <Column width="100%" alignItems="center">
                <Column gap={24} width="100%" maxWidth={500}>
                    {flow.currentStep === 'complete' ? (
                        <YieldFlowComplete
                            flowType="supply"
                            apy={apy}
                            input={{
                                token,
                                amount: completedAmount,
                            }}
                            output={{
                                token: receiptToken,
                                amount: completedReceiptAmount,
                            }}
                        />
                    ) : (
                        <>
                            <Text typographyStyle="headline-md">
                                <Translation id="TR_EARN_YIELD_SUPPLY" />
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
                                        flowType="supply"
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
                                    title={<Translation id="TR_EARN_YIELD_SUPPLY" />}
                                >
                                    {actionStepState === 'active' && (
                                        <YieldActionStep
                                            flowType="supply"
                                            token={token}
                                            amount={supplyAmount}
                                            summaryValue={`${maxAmount} ${token.symbol}`}
                                            warning={
                                                <YieldActionStepWarning
                                                    isInsufficientFunds={isSupplyAmountTooHigh}
                                                    isApprovalInsufficient={isApprovalInsufficient}
                                                    onModifyApproval={enterModifyApproval}
                                                />
                                            }
                                            isDisabled={
                                                isSupplyAmountTooHigh ||
                                                isApprovalInsufficient ||
                                                isSubmittingSupply
                                            }
                                            pendingTransaction={supplyPendingTransaction}
                                            onAmountSelect={setSupplyAmount}
                                            onMaxClick={() => setSupplyAmount(maxAmount)}
                                            onSubmit={submitSupply}
                                            onPendingTxClick={openPendingTransaction}
                                        />
                                    )}
                                </BulletList.Item>

                                <BulletList.Item
                                    state={completeStepState}
                                    title={<Translation id="TR_EARN_YIELD_SUPPLY_COMPLETE" />}
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
