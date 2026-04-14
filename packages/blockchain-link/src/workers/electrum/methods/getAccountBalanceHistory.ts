import {
    type AccountAddresses,
    type Address,
    type Transaction,
} from '@trezor/blockchain-link-types/src/common';
import type { HistoryTx } from '@trezor/blockchain-link-types/src/electrum';
import type { GetAccountBalanceHistory as Req } from '@trezor/blockchain-link-types/src/messages';
import type { GetAccountBalanceHistory as Res } from '@trezor/blockchain-link-types/src/responses';
import { sumVinVout } from '@trezor/blockchain-link-utils';
import { transformTransaction } from '@trezor/blockchain-link-utils/src/blockbook';
import { BigNumber } from '@trezor/utils/src/bigNumber';
import { discovery } from '@trezor/utxo-lib';

import {
    type AddressHistory,
    type Api,
    discoverAddress,
    getTransactions,
    tryGetScripthash,
} from '../utils';

const transformAddress = (addr: AddressHistory): Address => ({
    address: addr.address,
    path: addr.path,
    transfers: addr.history.length,
    balance: '0',
    sent: '0',
    received: '0',
});

const aggregateTransactions = (txs: (Transaction & { blockTime: number })[], groupBy = 3600) => {
    const result: Res['payload'] = [];
    let i = 0;
    while (i < txs.length) {
        const currentTx = txs[i];
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        const time = Math.floor(currentTx.blockTime / groupBy) * groupBy;
        let j = i;
        let received = 0;
        let sent = 0;
        let sentToSelf = 0;
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        while (j < txs.length && txs[j].blockTime < time + groupBy) {
            const {
                // @ts-expect-error: indexing with noUncheckedIndexedAccess
                type,
                // @ts-expect-error: indexing with noUncheckedIndexedAccess
                amount,
                // @ts-expect-error: indexing with noUncheckedIndexedAccess
                fee,
                // @ts-expect-error: indexing with noUncheckedIndexedAccess
                details: { vin, vout, totalInput, totalOutput },
            } = txs[j];
            if (type === 'recv') received += Number.parseInt(amount, 10);
            else if (type === 'sent')
                sent += Number.parseInt(amount, 10) + Number.parseInt(fee, 10);
            else if (type === 'self') {
                sentToSelf += Number.parseInt(totalOutput, 10);
                sent += Number.parseInt(totalInput, 10);
                received += Number.parseInt(totalOutput, 10);
            } else if (type === 'joint') {
                const myTotalInput = new BigNumber(
                    // @ts-expect-error: indexing with noUncheckedIndexedAccess
                    vin.filter(vin => vin.isAccountOwned).reduce(sumVinVout, 0),
                ).toNumber();
                const myTotalOutput = new BigNumber(
                    // @ts-expect-error: indexing with noUncheckedIndexedAccess
                    vout.filter(vout => vout.isAccountOwned).reduce(sumVinVout, 0),
                ).toNumber();
                sent += myTotalInput;
                received += myTotalOutput;
                sentToSelf += Math.min(myTotalInput, myTotalOutput);
            }
            j++;
        }
        result.push({
            time,
            txs: j - i,
            received: received.toString(),
            sent: sent.toString(),
            sentToSelf: sentToSelf.toString(),
            rates: {},
        });
        i = j;
    }

    return result;
};

const getAccountBalanceHistory: Api<Req, Res> = async (
    { client, addressCache },
    { descriptor, from, to, groupBy },
) => {
    let history: HistoryTx[];
    let addresses: AccountAddresses | undefined;
    const network = client.getInfo()?.network;

    const parsed = tryGetScripthash(descriptor, network);
    if (parsed.valid) {
        history = await client.request('blockchain.scripthash.get_history', parsed.scripthash);
        addresses = undefined;
    } else {
        const discover = discoverAddress(client);
        const receive = await discovery(discover, addressCache(descriptor, 'receive'));
        const change = await discovery(discover, addressCache(descriptor, 'change'));
        addresses = {
            change: change.map(transformAddress),
            used: receive.filter(({ history }) => history.length).map(transformAddress),
            unused: receive.filter(({ history }) => !history.length).map(transformAddress),
        };
        history = receive
            .map(({ history }) => history)
            .concat(change.map(({ history }) => history))
            .flat();
    }

    const txs = await getTransactions(client, history).then(txs =>
        txs
            .filter(
                ({ blockTime }) =>
                    (from || 0) <= blockTime && blockTime <= (to || Number.MAX_SAFE_INTEGER),
            )
            .sort((a, b) => a.blockTime - b.blockTime)
            .map(tx => ({ blockTime: -1, ...transformTransaction(tx, addresses ?? descriptor) })),
    );

    return aggregateTransactions(txs, groupBy);
};

export default getAccountBalanceHistory;
