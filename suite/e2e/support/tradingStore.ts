import type { Page } from '@playwright/test';

type SwapHistoryItem = {
    orderId: string;
    date: string;
    sendSymbol: string;
    data: {
        exchange: string;
        orderId: string;
        status: string;
        send: string;
        sendAddress: string;
        sendStringAmount: string;
        receive: string;
        receiveAddress: string;
        receiveStringAmount: string;
        statusUrl: string;
    };
};

export class TradingStoreFixture {
    constructor(private page: Page) {}

    async insertSwapHistory(trades: SwapHistoryItem[]) {
        await this.page.evaluate(inputTrades => {
            const accounts = window.store.getState().wallet.accounts as Array<{
                key: string;
                symbol: string;
            }>;
            const accountKeyBySymbol = new Map(
                accounts.map(account => [account.symbol, account.key]),
            );

            for (const trade of inputTrades) {
                window.store.dispatch({
                    type: '@trading/saveTrade',
                    payload: {
                        tradeType: 'exchange',
                        key: trade.orderId,
                        date: trade.date,
                        sendAccountKey: accountKeyBySymbol.get(trade.sendSymbol)!,
                        data: trade.data,
                    },
                });
            }
        }, trades);
    }
}
