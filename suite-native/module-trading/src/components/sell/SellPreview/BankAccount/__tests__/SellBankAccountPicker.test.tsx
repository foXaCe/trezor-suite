import React from 'react';

import { type TradingTransaction } from '@suite-common/trading';
import { renderWithStoreProvider } from '@suite-native/test-utils-store';
import { bankAccounts, eth1NormalAccount, getWalletState } from '@suite-native/trading-fixtures';

import { SellBankAccountPicker } from '../SellBankAccountPicker';

// Mock the SellBankAccountSheet component to isolate the picker component
jest.mock('../SellBankAccountSheet', () => ({
    SellBankAccountSheet: jest.fn().mockImplementation(() => <div>Bank Account Sheet</div>),
}));

describe('SellBankAccountPicker', () => {
    const mockOnBankAccountSelect = jest.fn();
    type SellTradingTransaction = Extract<TradingTransaction, { tradeType: 'sell' }>;

    const getTrade = (
        bankAccountsValue: SellTradingTransaction['data']['bankAccounts'],
    ): SellTradingTransaction => ({
        tradeType: 'sell',
        date: '2024-01-01T00:00:00.000Z',
        sendAccountKey: eth1NormalAccount.key,
        data: {
            orderId: 'order_id_1',
            bankAccounts: bankAccountsValue,
        },
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Conditional Rendering', () => {
        it('should not render when no bank accounts are available', () => {
            const preloadedState = {
                wallet: getWalletState({ tradeType: 'sell' }),
            };

            preloadedState.wallet.trading.sell.tradingAccountKey = eth1NormalAccount.key;
            preloadedState.wallet.trading.trades = [getTrade([])];

            const { queryByTestId } = renderWithStoreProvider(
                <SellBankAccountPicker
                    orderId="order_id_1"
                    selectedBankAccountIban=""
                    onBankAccountSelect={mockOnBankAccountSelect}
                />,
                { preloadedState },
            );

            expect(queryByTestId('@trading/sell/bank-account-item')).not.toBeOnTheScreen();
        });

        it('should not render when bankAccounts is undefined', () => {
            const preloadedState = {
                wallet: getWalletState({ tradeType: 'sell' }),
            };

            preloadedState.wallet.trading.sell.tradingAccountKey = eth1NormalAccount.key;
            preloadedState.wallet.trading.trades = [getTrade(undefined)];

            const { queryByTestId } = renderWithStoreProvider(
                <SellBankAccountPicker
                    orderId="order_id_1"
                    selectedBankAccountIban=""
                    onBankAccountSelect={mockOnBankAccountSelect}
                />,
                { preloadedState },
            );

            expect(queryByTestId('@trading/sell/bank-account-item')).not.toBeOnTheScreen();
        });

        it('should not render when orderId is undefined', () => {
            const preloadedState = {
                wallet: getWalletState({ tradeType: 'sell' }),
            };

            preloadedState.wallet.trading.sell.tradingAccountKey = eth1NormalAccount.key;
            preloadedState.wallet.trading.trades = [getTrade(bankAccounts)];

            const { queryByTestId } = renderWithStoreProvider(
                <SellBankAccountPicker
                    orderId={undefined}
                    selectedBankAccountIban={bankAccounts[0].bankAccount}
                    onBankAccountSelect={mockOnBankAccountSelect}
                />,
                { preloadedState },
            );

            expect(queryByTestId('@trading/sell/bank-account-item')).not.toBeOnTheScreen();
        });
    });
});
