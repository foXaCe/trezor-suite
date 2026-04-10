import { type TranslationKey } from '@suite/intl';
import { type TransactionDto } from '@suite-common/earn-api';

import type {
    YieldApproveModalState,
    YieldFlowStepId,
    YieldPendingTransactionState,
} from './types';

export type YieldFlowState = {
    step: YieldFlowStepId;
    // Approve step
    approveAmount: string;
    approveModalState: YieldApproveModalState | null;
    submitTxHashTransactionId: string | null;
    isSubmittingApprove: boolean;
    isApprovePending: boolean;
    // Approval flow state machine (revoke/modify)
    isModifyMode: boolean;
    lastApprovedAmount: string;
    revokeRequired: boolean;
    shouldRevokeOnApproveCancel: boolean;
    revokeTransactions: TransactionDto[] | null;
    approvedSpender: string | null;
    // Action step (supply / withdraw)
    actionAmount: string;
    isSubmittingAction: boolean;
    // Transaction tracking
    pendingTransaction: YieldPendingTransactionState | null;
    pendingReceiptAmount: string;
    // Complete step
    completedAmount: string;
    completedReceiptAmount: string;
    // Error
    error: TranslationKey | null;
};

export type YieldFlowAction =
    | { type: 'SET_ERROR'; error: TranslationKey }
    | { type: 'CLEAR_ERROR' }
    | { type: 'SET_APPROVE_AMOUNT'; amount: string }
    | {
          type: 'OPEN_APPROVE_MODAL';
          modalState: YieldApproveModalState;
          txHashTransactionId: string | null;
      }
    | { type: 'CLOSE_APPROVE_MODAL' }
    | {
          type: 'SET_APPROVAL_RESPONSE';
          approvedSpender: string | null;
          revokeTransactions: TransactionDto[] | null;
      }
    | { type: 'SET_REVOKE_REQUIRED' }
    | { type: 'CLEAR_APPROVAL_TRANSITION' }
    | { type: 'START_SUBMITTING_APPROVE' }
    | { type: 'FINISH_SUBMITTING_APPROVE' }
    | { type: 'ENTER_MODIFY_MODE'; amount: string }
    | { type: 'COMPLETE_APPROVAL'; amount: string }
    | { type: 'REVOKE_SUCCESS' }
    | { type: 'SET_ACTION_AMOUNT'; amount: string }
    | { type: 'START_SUBMITTING_ACTION' }
    | { type: 'FINISH_SUBMITTING_ACTION' }
    | { type: 'SET_PENDING_TX'; tx: YieldPendingTransactionState; receiptAmount?: string }
    | { type: 'COMPLETE_ACTION'; amount: string }
    | { type: 'TRANSACTION_FAILED' }
    | { type: 'GO_TO_STEP'; step: YieldFlowStepId }
    | { type: 'RESET' };

export const INITIAL_YIELD_FLOW_STATE: YieldFlowState = {
    step: 'approve',
    approveAmount: '',
    approveModalState: null,
    submitTxHashTransactionId: null,
    isSubmittingApprove: false,
    isApprovePending: false,
    isModifyMode: false,
    lastApprovedAmount: '',
    revokeRequired: false,
    shouldRevokeOnApproveCancel: false,
    revokeTransactions: null,
    approvedSpender: null,
    actionAmount: '',
    isSubmittingAction: false,
    pendingTransaction: null,
    pendingReceiptAmount: '',
    completedAmount: '0',
    completedReceiptAmount: '0',
    error: null,
};

export const yieldFlowReducer = (
    state: YieldFlowState,
    action: YieldFlowAction,
): YieldFlowState => {
    switch (action.type) {
        case 'SET_ERROR':
            return { ...state, error: action.error };
        case 'CLEAR_ERROR':
            return { ...state, error: null };
        case 'SET_APPROVE_AMOUNT':
            return { ...state, approveAmount: action.amount };
        case 'OPEN_APPROVE_MODAL':
            return {
                ...state,
                approveModalState: action.modalState,
                submitTxHashTransactionId: action.txHashTransactionId,
            };
        case 'CLOSE_APPROVE_MODAL':
            return {
                ...state,
                approveModalState: null,
                submitTxHashTransactionId: null,
                error: null,
            };
        case 'SET_APPROVAL_RESPONSE':
            return {
                ...state,
                approvedSpender: action.approvedSpender,
                revokeTransactions: action.revokeTransactions,
            };
        case 'SET_REVOKE_REQUIRED':
            return { ...state, revokeRequired: true };
        case 'CLEAR_APPROVAL_TRANSITION':
            return { ...state, shouldRevokeOnApproveCancel: false, revokeTransactions: null };
        case 'START_SUBMITTING_APPROVE':
            return { ...state, isSubmittingApprove: true, error: null };
        case 'FINISH_SUBMITTING_APPROVE':
            return { ...state, isSubmittingApprove: false };
        case 'ENTER_MODIFY_MODE':
            return {
                ...state,
                isModifyMode: true,
                shouldRevokeOnApproveCancel: true,
                approveAmount: action.amount,
                approveModalState: null,
                pendingTransaction: null,
                submitTxHashTransactionId: null,
                error: null,
                step: 'approve',
            };
        case 'COMPLETE_APPROVAL':
            return {
                ...state,
                isModifyMode: false,
                lastApprovedAmount: action.amount,
                actionAmount: action.amount,
                isApprovePending: false,
                pendingTransaction: null,
                shouldRevokeOnApproveCancel: false,
                revokeTransactions: null,
                step: 'action',
            };
        case 'REVOKE_SUCCESS':
            return {
                ...state,
                isModifyMode: false,
                lastApprovedAmount: '',
                revokeRequired: false,
                isApprovePending: false,
                pendingTransaction: null,
            };
        case 'SET_ACTION_AMOUNT':
            return { ...state, actionAmount: action.amount };
        case 'START_SUBMITTING_ACTION':
            return { ...state, isSubmittingAction: true, error: null };
        case 'FINISH_SUBMITTING_ACTION':
            return { ...state, isSubmittingAction: false };
        case 'SET_PENDING_TX':
            return {
                ...state,
                pendingTransaction: action.tx,
                pendingReceiptAmount: action.receiptAmount ?? state.pendingReceiptAmount,
                isApprovePending:
                    action.tx.type === 'approve' ||
                    action.tx.type === 'revoke' ||
                    action.tx.type === 'revoke-only',
            };
        case 'COMPLETE_ACTION':
            return {
                ...state,
                completedAmount: action.amount,
                completedReceiptAmount: state.pendingReceiptAmount,
                pendingTransaction: null,
                step: 'complete',
            };
        case 'TRANSACTION_FAILED':
            return {
                ...state,
                pendingTransaction: null,
                isApprovePending: false,
                error: 'TR_EARN_YIELD_ERROR_TRANSACTION_FAILED',
            };
        case 'GO_TO_STEP':
            return { ...state, step: action.step };
        case 'RESET':
            return INITIAL_YIELD_FLOW_STATE;
        default:
            return state;
    }
};
