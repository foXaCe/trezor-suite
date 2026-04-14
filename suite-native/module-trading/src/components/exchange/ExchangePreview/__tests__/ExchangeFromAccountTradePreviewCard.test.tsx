import { deviceInitialState } from '@suite-common/device';
import { messageSystemInitialState } from '@suite-common/message-system';
import { initialSuiteSyncDataState, initialSuiteSyncState } from '@suite-common/suite-sync';
import type { AccountKey } from '@suite-common/wallet-types';
import { renderWithStoreProvider } from '@suite-native/test-utils-store';
import { eth1NormalAccount, exchangeQuotes, getWalletState } from '@suite-native/trading-fixtures';

import {
    ExchangeFromAccountTradePreviewCard,
    type ExchangeFromAccountTradePreviewCardProps,
} from '../ExchangeFromAccountTradePreviewCard';

describe('ExchangeFromAccountTradePreviewCard', () => {
    const renderExchangeFromAccountTradePreviewCard = (
        props: Partial<ExchangeFromAccountTradePreviewCardProps> = {},
        tradingAccountKey = eth1NormalAccount.key,
    ) => {
        const preloadedState = {
            device: deviceInitialState,
            messageSystem: messageSystemInitialState,
            suiteSync: initialSuiteSyncState,
            suiteSyncData: initialSuiteSyncDataState,
            wallet: getWalletState({ tradeType: 'exchange' }),
        };
        preloadedState.wallet.trading.composedTransactionInfo = {
            composed: {
                fee: '1000',
                feePerByte: '1',
                feeLimit: '21000',
                estimatedFeeLimit: '21000',
            },
        };
        preloadedState.wallet.trading.exchange.tradingAccountKey = tradingAccountKey;

        return renderWithStoreProvider(<ExchangeFromAccountTradePreviewCard {...props} />, {
            preloadedState,
        });
    };

    it('should render nothing when there is no quote', () => {
        const { toJSON } = renderExchangeFromAccountTradePreviewCard({});

        expect(toJSON()).toBeNull();
    });

    it('should render nothing when account is not found', () => {
        const { toJSON } = renderExchangeFromAccountTradePreviewCard(
            { quote: exchangeQuotes[0] },
            'unknown-account-key' as AccountKey,
        );

        expect(toJSON()).toBeNull();
    });

    it('should render TradeSideCard otherwise', () => {
        const { getByText } = renderExchangeFromAccountTradePreviewCard({
            quote: exchangeQuotes[0],
        });

        expect(getByText('From')).toBeOnTheScreen();
        expect(getByText('ETH Account #1')).toBeOnTheScreen();
        expect(getByText('-100 USDC')).toBeOnTheScreen();
        expect(getByText(`100-${exchangeQuotes[0].send}`)).toBeOnTheScreen();
    });

    // Todo: https://github.com/trezor/trezor-suite/issues/24906
    it.skip('should display correct account name', () => {
        const { getByText } = renderExchangeFromAccountTradePreviewCard({
            quote: exchangeQuotes[0],
        });
        expect(getByText('BTC Account #1')).toBeOnTheScreen();
    });
});
