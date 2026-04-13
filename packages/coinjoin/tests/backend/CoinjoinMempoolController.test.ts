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
const ADDRESS = SEGWIT_RECEIVE_ADDRESSES[1] as string;
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
        for (const tx of [TXS[0], TXS[1]]) {
            if (tx) client.fireTx(tx);
        }
        expect(mempool.getTransactions()).toEqual([]);

        await mempool.start();
        for (const tx of [TXS[2], TXS[3]]) {
            if (tx) client.fireTx(tx);
        }
        expect(mempool.getTransactions()).toEqual([TXS[2], TXS[3]]);

        client.setMempoolTxs(
            [TXS[1], TXS[2], TXS[3]].filter((t): t is NonNullable<typeof t> => !!t),
        );
        await mempool.update(true);
        expect(mempool.getTransactions()).toEqual([TXS[2], TXS[3]]);

        if (TXS[4]) client.fireTx(TXS[4]);
        client.setMempoolTxs(
            [TXS[3], TXS[4], TXS[5]].filter((t): t is NonNullable<typeof t> => !!t),
        );
        await mempool.update(true);
        expect(mempool.getTransactions()).toEqual([TXS[3], TXS[4]]);

        if (TXS[5]) client.fireTx(TXS[5]);
        await mempool.update(true);
        expect(mempool.getTransactions()).toEqual([TXS[3], TXS[4], TXS[5]]);

        client.setMempoolTxs([TXS[0], TXS[1]].filter((t): t is NonNullable<typeof t> => !!t));
        await mempool.update(true);
        expect(mempool.getTransactions()).toEqual([]);
    });

    it('Filtering', async () => {
        mempool = new CoinjoinMempoolController({
            client,
            network: networks.regtest,
            filter: address =>
                address === (SEGWIT_RECEIVE_ADDRESSES[1] as string) ||
                address === (SEGWIT_CHANGE_ADDRESSES[0] as string),
        });
        client.setMempoolTxs(TXS);
        await mempool.init();
        expect(mempool.getTransactions()).toEqual([TXS[1], TXS[3], TXS[4]]);
    });

    it('Removing', async () => {
        client.setMempoolTxs(TXS);
        await mempool.init();
        expect(mempool.getTransactions()).toEqual(TXS);

        mempool.removeTransactions([
            (TXS[0] as (typeof TXS)[number]).txid,
            (TXS[2] as (typeof TXS)[number]).txid,
            'unknown',
            (TXS[4] as (typeof TXS)[number]).txid,
        ]);
        expect(mempool.getTransactions()).toEqual([TXS[1], TXS[3], TXS[5]]);
    });

    it('Replace-by-fee', async () => {
        const outpointCollision = { txid: 'foo', vout: 3 };
        const a1 = TXS[1];
        const b = TXS[2];
        const a2 = TXS[4];
        if (!a1 || !b || !a2 || !a1.vin[0] || !a2.vin[1])
            throw new Error('Missing test fixture data');
        a1.vin[0] = { ...a1.vin[0], ...outpointCollision };
        a2.vin[1] = { ...a2.vin[1], ...outpointCollision };

        client.setMempoolTxs([a1]);
        await mempool.start();
        await mempool.init();
        expect(mempool.getTransactions()).toEqual([a1]);
        client.fireTx(b);
        expect(mempool.getTransactions()).toEqual([a1, b]);
        client.fireTx(a2);
        expect(mempool.getTransactions()).toEqual([b, a2]);
    });
});
