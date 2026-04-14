import { type AccountKey } from '@suite-common/wallet-types';
import { getTranslation } from '@suite-native/intl';
import { renderWithStoreProvider } from '@suite-native/test-utils-store';
import { btc1NormalAccount, exchangeQuotes, getWalletState } from '@suite-native/trading-fixtures';

import { ExchangeFeePickerCard, type ExchangeFeePickerCardProps } from '../ExchangeFeePickerCard';

// Mock FeeSelector to avoid deep dependency chain
jest.mock('@suite-native/transaction-management', () => ({
    ...jest.requireActual('@suite-native/transaction-management'),
    FeeSelector: jest.fn(() => null),
}));

describe('ExchangeFeePickerCard', () => {
    const renderExchangeFeePickerCard = (
        props: Partial<ExchangeFeePickerCardProps> = {},
        tradingAccountKey: AccountKey = btc1NormalAccount.key,
    ) => {
        const walletState = getWalletState({ tradeType: 'exchange' });
        const preloadedState = {
            wallet: {
                ...walletState,
                formDrafts: {},
            },
        };
        preloadedState.wallet.trading.exchange.tradingAccountKey = tradingAccountKey;

        return renderWithStoreProvider(<ExchangeFeePickerCard isTxnError={false} {...props} />, {
            preloadedState,
        });
    };

    it('should render nothing when isTxnError', () => {
        const { toJSON } = renderExchangeFeePickerCard({
            quote: exchangeQuotes[0],
            isTxnError: true,
        });

        expect(toJSON()).toBeNull();
    });

    it('should render nothing when there is no quote', () => {
        const { toJSON } = renderExchangeFeePickerCard({});

        expect(toJSON()).toBeNull();
    });

    it('should render nothing when account is not found', () => {
        const { toJSON } = renderExchangeFeePickerCard(
            { quote: exchangeQuotes[0] },
            'unknown-account-key' as AccountKey,
        );

        expect(toJSON()).toBeNull();
    });

    it('should render FeePickerCard otherwise', () => {
        const { getByText } = renderExchangeFeePickerCard({ quote: exchangeQuotes[0] });

        expect(
            getByText(getTranslation('moduleTrading.tradingExchangePreviewScreen.details')),
        ).toBeOnTheScreen();
    });
});
