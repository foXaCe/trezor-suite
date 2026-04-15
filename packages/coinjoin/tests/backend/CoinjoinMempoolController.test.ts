import { networks } from '@trezor/utxo-lib';

import { CoinjoinMempoolController } from '../../src/backend/CoinjoinMempoolController';
import { AccountAddress } from '../../src/types/backend';
import {
    BLOCKS,
    SEGWIT_CHANGE_ADDRESSES,
    SEGWIT_RECEIVE_ADDRESSES,
} from '../fixtures/methods.fixture';
import { MockMempoolClient } from '../mocks/MockMempoolClient';

const TXS = BLOCKS.flatMap(block => block.txs); // There is 6 of them
const ADDRESS = SEGWIT_RECEIVE_ADDRESSES[1];
const TXS_MATCH = [TXS[1], TXS[3]];

describe('CoinjoinMempoolController', () => {
    const client = new MockMempoolClient();
    let mempool: CoinjoinMempoolController;

    beforeEach(() => {
        client.clear();
        mempool = new CoinjoinMempoolController({ client, network: networks.regtest });
    });

    it('All at once', async () => {
        client.setMempoolTxs(TXS);
        await mempool.init();
        expect(mempool.getTransactions()).toEqual(TXS);
        expect(
            mempool.getTransactions({
                receive: [{ address: ADDRESS } as AccountAddress],
                change: [],
                analyze: (getTxs, onTxs) => {
                    const txs = getTxs({ address: ADDRESS } as AccountAddress);
                    onTxs?.(txs);

                    return { receive: [], change: [] };
                },
            }),
        ).toEqual(TXS_MATCH);
        client.setMempoolTxs([]);
        await mempool.update(true);
        expect(mempool.getTransactions()).toEqual([]);
    });

    it('Progressing', async () => {
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        [TXS[0], TXS[1]].forEach(client.fireTx.bind(client));
        expect(mempool.getTransactions()).toEqual([]);

        await mempool.start();
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        [TXS[2], TXS[3]].forEach(client.fireTx.bind(client));
        expect(mempool.getTransactions()).toEqual([TXS[2], TXS[3]]);

        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        client.setMempoolTxs([TXS[1], TXS[2], TXS[3]]);
        await mempool.update(true);
        expect(mempool.getTransactions()).toEqual([TXS[2], TXS[3]]);

        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        [TXS[4]].forEach(client.fireTx.bind(client));
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        client.setMempoolTxs([TXS[3], TXS[4], TXS[5]]);
        await mempool.update(true);
        expect(mempool.getTransactions()).toEqual([TXS[3], TXS[4]]);

        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        [TXS[5]].forEach(client.fireTx.bind(client));
        await mempool.update(true);
        expect(mempool.getTransactions()).toEqual([TXS[3], TXS[4], TXS[5]]);

        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        client.setMempoolTxs([TXS[0], TXS[1]]);
        await mempool.update(true);
        expect(mempool.getTransactions()).toEqual([]);
    });

    it('Filtering', async () => {
        mempool = new CoinjoinMempoolController({
            client,
            network: networks.regtest,
            filter: address =>
                address === SEGWIT_RECEIVE_ADDRESSES[1] || address === SEGWIT_CHANGE_ADDRESSES[0],
        });
        client.setMempoolTxs(TXS);
        await mempool.init();
        expect(mempool.getTransactions()).toEqual([TXS[1], TXS[3], TXS[4]]);
    });

    it('Removing', async () => {
        client.setMempoolTxs(TXS);
        await mempool.init();
        expect(mempool.getTransactions()).toEqual(TXS);

        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        const TXSItem: (typeof TXS)[number] = TXS[0];
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        const TXSItem2: (typeof TXS)[number] = TXS[2];
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        const TXSItem4: (typeof TXS)[number] = TXS[4];
        mempool.removeTransactions([TXSItem.txid, TXSItem2.txid, 'unknown', TXSItem4.txid]);
        expect(mempool.getTransactions()).toEqual([TXS[1], TXS[3], TXS[5]]);
    });

    it('Replace-by-fee', async () => {
        const outpointCollision = { txid: 'foo', vout: 3 };
        const a1 = TXS[1];
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        a1.vin[0] = { ...a1.vin[0], ...outpointCollision };
        const b = TXS[2];
        const a2 = TXS[4];
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        a2.vin[1] = { ...a2.vin[1], ...outpointCollision };

        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        client.setMempoolTxs([a1]);
        await mempool.start();
        await mempool.init();
        expect(mempool.getTransactions()).toEqual([a1]);
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        client.fireTx(b);
        expect(mempool.getTransactions()).toEqual([a1, b]);
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        client.fireTx(a2);
        expect(mempool.getTransactions()).toEqual([b, a2]);
    });
});
