import { createContext, useContext } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { type TranslationKey } from '@suite/intl';
import type { Account } from '@suite-common/wallet-types';

import type {
    UseYieldFlowStepsResult,
    YieldApproveModalState,
    YieldFlowDisplayToken,
    YieldFlowFormValues,
    YieldFlowToken,
    YieldPendingTransactionState,
} from '../types';

export type YieldSupplyContextValues = {
    account: Account;
    token: YieldFlowToken;
    receiptToken: YieldFlowDisplayToken;
    apy: number | null;
    approveAmount: string;
    supplyAmount: string;
    completedAmount: string;
    completedReceiptAmount: string;
    maxAmount: string;
    errorMessage?: TranslationKey;
    approveModalState: YieldApproveModalState | null;
    pendingTransaction: YieldPendingTransactionState | null;
    isModifyMode: boolean;
    lastApprovedAmount: string;
    revokeRequired: boolean;
    isApproveAmountTooHigh: boolean;
    isSupplyAmountTooHigh: boolean;
    isApprovalInsufficient: boolean;
    isSubmittingApprove: boolean;
    isSubmittingSupply: boolean;
    setApproveAmount: (amount: string) => void;
    setSupplyAmount: (amount: string) => void;
    submitApprove: () => Promise<void>;
    submitSupply: () => Promise<void>;
    submitRevoke: () => Promise<void>;
    enterModifyApproval: () => void;
    handleApproveModalCancel: () => void;
    handleApproveSuccessTxid: (txid: string) => Promise<void>;
    openPendingTransaction: (txid: string) => void;
    methods: UseFormReturn<YieldFlowFormValues>;
    flow: UseYieldFlowStepsResult;
};

export const YieldSupplyContext = createContext<YieldSupplyContextValues | null>(null);
YieldSupplyContext.displayName = 'YieldSupplyContext';

export const useYieldSupplyContext = () => {
    const context = useContext(YieldSupplyContext);

    if (context === null) {
        throw Error('YieldSupplyContext used without Context');
    }

    return context;
};
