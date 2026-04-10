import type { GetTransaction as Req } from '@trezor/blockchain-link-types/src/messages';
import type { GetTransaction as Res } from '@trezor/blockchain-link-types/src/responses';
import { transformTransaction } from '@trezor/blockchain-link-utils/src/blockbook';

import { type Api, getTransactions } from '../utils';

const getTransaction: Api<Req, Res> = async ({ client }, payload) => {
    const [tx] = await getTransactions(client, [{ tx_hash: payload, height: -1 }]);
    if (!tx) throw new Error(`Transaction not found: ${payload}`);

    return transformTransaction(tx);
};

export default getTransaction;
