import { useEffect, useRef } from 'react';

import { useGetYieldProvider } from '@suite-common/earn-api';
import { toTokenCryptoId } from '@suite-common/trading';
import { type Account } from '@suite-common/wallet-types';

import { ApproveModal } from 'src/components/suite/modals/ReduxModal/UserContextModal/AllowanceModals/ApproveModal';
import { RevokeModal } from 'src/components/suite/modals/ReduxModal/UserContextModal/AllowanceModals/RevokeModal';
import { useAllowanceContext } from 'src/hooks/wallet/allowance';

import { type EarnProviderId, earnProviderMetadata } from '../../providers/providerMetadata';

export type YieldApproveModalProps = {
    amount: string;
    contractAddress: string;
    account: Account;
    spender: string;
    providerId?: string;
    preapprovedAmount?: string;
    txType: 'approve' | 'revoke' | 'revoke-only';
    onCancel: () => void;
    onSuccessTxid: (txid: string) => Promise<void> | void;
};

const getDefaultProviderName = (providerId?: string) => {
    if (providerId && providerId in earnProviderMetadata) {
        return earnProviderMetadata[providerId as EarnProviderId].name;
    }

    return providerId ?? earnProviderMetadata.morpho.name;
};

export const YieldApproveModal = ({
    amount,
    contractAddress,
    account,
    spender,
    providerId,
    preapprovedAmount,
    txType,
    onCancel,
    onSuccessTxid,
}: YieldApproveModalProps) => {
    const {
        state: { isApproveModalOpen, isRevokeModalOpen, openApproveModal, openRevokeModal },
        tx: { approvalTxid, setApprovalTxid },
    } = useAllowanceContext();
    const handledTxidRef = useRef<string | null>(null);
    const defaultProviderName = getDefaultProviderName(providerId);
    const isApproveTransaction = txType === 'approve';

    const cryptoId = toTokenCryptoId(account.symbol, contractAddress);
    const providerQuery = useGetYieldProvider(providerId);
    const providerName = providerQuery.data?.data.name ?? defaultProviderName;
    const provider = {
        name: providerName,
        companyName: providerName,
        logo: providerQuery.data?.data.logoURI ?? '',
        isActive: true,
    };

    useEffect(() => {
        if (isApproveTransaction) {
            openApproveModal();

            return;
        }

        openRevokeModal();
    }, [isApproveTransaction, openApproveModal, openRevokeModal]);

    useEffect(() => {
        if (!approvalTxid || handledTxidRef.current === approvalTxid) {
            return;
        }

        handledTxidRef.current = approvalTxid;

        void (async () => {
            try {
                await onSuccessTxid(approvalTxid);
            } finally {
                setApprovalTxid(null);
            }
        })();
    }, [approvalTxid, onSuccessTxid, setApprovalTxid]);

    if (isApproveTransaction) {
        if (!isApproveModalOpen) {
            return null;
        }

        return (
            <ApproveModal
                amount={amount}
                cryptoId={cryptoId}
                account={account}
                provider={provider}
                spender={spender}
                onCancel={onCancel}
            />
        );
    }

    if (!isRevokeModalOpen) {
        return null;
    }

    return (
        <RevokeModal
            cryptoId={cryptoId}
            account={account}
            provider={provider}
            spender={spender}
            preapprovedAmount={preapprovedAmount}
            onCancel={onCancel}
        />
    );
};
