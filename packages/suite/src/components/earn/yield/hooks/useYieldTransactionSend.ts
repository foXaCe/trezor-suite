import { useCallback } from 'react';

import { selectAddressDisplayType } from '@suite/settings';
import { type TransactionDto } from '@suite-common/earn-api';
import { parseUnsignedEvmTransactionForSigning } from '@suite-common/earn-api/src/verification/schema';
import { transactionsActions } from '@suite-common/wallet-core';
import type { Account } from '@suite-common/wallet-types';
import { AddressDisplayOptions } from '@suite-common/wallet-types';
import { getAccountIdentity } from '@suite-common/wallet-utils';
import TrezorConnect, { type EthereumSignTransaction } from '@trezor/connect';

import { useDevice, useDispatch, useSelector } from 'src/hooks/suite';

const serializeNonce = (nonce: number | `0x${string}`) =>
    typeof nonce === 'number' ? `0x${nonce.toString(16)}` : nonce;

type ParsedTransactionForSigning = NonNullable<
    ReturnType<typeof parseUnsignedEvmTransactionForSigning>
>;

const getTransactionForSigning = (
    parsedTransaction: ParsedTransactionForSigning,
): EthereumSignTransaction['transaction'] => {
    const commonTransactionFields = {
        to: parsedTransaction.to,
        value: parsedTransaction.value ?? '0x0',
        gasLimit: parsedTransaction.gasLimit,
        nonce: serializeNonce(parsedTransaction.nonce),
        data: parsedTransaction.data,
        chainId: parsedTransaction.chainId,
    };

    if (parsedTransaction.maxFeePerGas && parsedTransaction.maxPriorityFeePerGas) {
        return {
            ...commonTransactionFields,
            maxFeePerGas: parsedTransaction.maxFeePerGas,
            maxPriorityFeePerGas: parsedTransaction.maxPriorityFeePerGas,
        };
    }

    if (parsedTransaction.gasPrice) {
        return {
            ...commonTransactionFields,
            gasPrice: parsedTransaction.gasPrice,
            txType: parsedTransaction.type,
        };
    }

    throw new Error('Yield transaction gas parameters are missing.');
};

export const useYieldTransactionSend = () => {
    const { device } = useDevice();
    const addressDisplayType = useSelector(selectAddressDisplayType);
    const dispatch = useDispatch();

    return useCallback(
        async ({ account, transaction }: { account: Account; transaction: TransactionDto }) => {
            if (!device) {
                throw new Error('Device not found.');
            }

            if (account.networkType !== 'ethereum') {
                throw new Error('Yield actions currently support only EVM accounts.');
            }

            const parsedTransaction = parseUnsignedEvmTransactionForSigning(
                transaction.unsignedTransaction,
            );

            if (!parsedTransaction) {
                throw new Error('Unsupported yield transaction payload.');
            }

            const transactionForSigning = getTransactionForSigning(parsedTransaction);

            const signingResponse = await TrezorConnect.ethereumSignTransaction({
                device: {
                    path: device.path,
                    instance: device.instance,
                    state: device.state,
                    useEmptyPassphrase: device.useEmptyPassphrase,
                },
                path: account.path,
                transaction: transactionForSigning,
                chunkify: addressDisplayType === AddressDisplayOptions.CHUNKED,
            });

            if (!signingResponse.success) {
                throw new Error(signingResponse.error.message);
            }

            const pushResponse = await TrezorConnect.pushTransaction({
                tx: signingResponse.payload.serializedTx,
                coin: account.symbol,
                identity: getAccountIdentity(account),
            });

            if (!pushResponse.success) {
                throw new Error(pushResponse.error.message);
            }

            const { txid } = pushResponse.payload;

            dispatch(
                transactionsActions.addTransaction({
                    transactions: [
                        {
                            type: 'sent',
                            txid,
                            blockTime: Math.floor(Date.now() / 1000),
                            amount: '0',
                            fee: '0',
                            targets: [],
                            tokens: [],
                            internalTransfers: [],
                            details: {
                                vin: [],
                                vout: [],
                                size: 0,
                                totalInput: '0',
                                totalOutput: '0',
                            },
                        },
                    ],
                    account,
                }),
            );

            return { txid };
        },
        [addressDisplayType, device, dispatch],
    );
};
