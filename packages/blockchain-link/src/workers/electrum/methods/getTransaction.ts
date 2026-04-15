import type { GetTransaction as Req } from '@trezor/blockchain-link-types/src/messages';
import type { GetTransaction as Res } from '@trezor/blockchain-link-types/src/responses';
import { transformTransaction } from '@trezor/blockchain-link-utils/src/blockbook';

import { type Api, getTransactions } from '../utils';

const getTransaction: Api<Req, Res> = async ({ client }, payload) => {
    const txs = await getTransactions(client, [{ tx_hash: payload, height: -1 }]);

    // @ts-expect-error: indexing with noUncheckedIndexedAccess
    const tx: Parameters<typeof transformTransaction>[0] = txs[0];

    return transformTransaction(tx);
};

export default getTransaction;
