import { deviceInitialState } from '@suite-common/device';
import { geolocationInitialState } from '@suite-common/geolocation';
import { messageSystemInitialState } from '@suite-common/message-system';
import { FeatureFlag, featureFlagsInitialState } from '@suite-native/feature-flags';
import { renderWithStoreProvider, screen } from '@suite-native/test-utils-store';
import { getInitializedTradingState } from '@suite-native/trading-fixtures';

import { TradingScreen } from '../TradingScreen';

jest.mock('@trezor/react-utils', () => ({
    ...jest.requireActual('@trezor/react-utils'),
    useTimer: () => ({
        timeSpent: {
            seconds: 0,
        },
        resetCount: 0,
        isStopped: false,
        isLoading: false,
        stop: () => {},
        reset: () => {},
        loading: () => {},
    }),
}));

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual('@react-navigation/native'),
    useRoute: () => ({ name: 'TradingScreen' }),
}));

jest.mock('../../hooks/buy/useBuyData', () => ({
    useBuyData: () => ({
        isLoading: false,
        lastLoadedTimestamp: 1,
        isFullyLoaded: true,
    }),
}));

jest.mock('../../hooks/exchange/useExchangeData', () => ({
    useExchangeData: () => ({
        isLoading: false,
        lastLoadedTimestamp: 1,
        isFullyLoaded: true,
    }),
}));

const stateWithEnabledBuy = {
    device: deviceInitialState,
    geolocation: geolocationInitialState,
    featureFlags: {
        ...featureFlagsInitialState,
        [FeatureFlag.IsTradingBuyEnabled]: true,
        [FeatureFlag.IsTradingResidenceCheckEnabled]: false,
    },
    messageSystem: messageSystemInitialState,
    wallet: {
        trading: getInitializedTradingState(),
    },
};

const stateWithDisabledTrading = {
    device: deviceInitialState,
    geolocation: geolocationInitialState,
    featureFlags: {
        ...featureFlagsInitialState,
        [FeatureFlag.IsTradingBuyEnabled]: false,
        [FeatureFlag.IsTradingResidenceCheckEnabled]: false,
    },
    messageSystem: {
        validMessages: {
            feature: ['actionId'],
            banner: [],
            context: [],
            modal: [],
        },
        dismissedMessages: [],
        config: {
            actions: [
                {
                    message: {
                        id: 'actionId',
                        category: ['feature'],
                        feature: [
                            {
                                domain: 'trading.buy',
                                flag: false,
                            },
                            {
                                domain: 'trading.exchange',
                                flag: false,
                            },
                            {
                                domain: 'trading.sell',
                                flag: false,
                            },
                        ],
                    },
                },
            ],
        },
    },
    wallet: {
        trading: getInitializedTradingState(),
    },
};

describe('TradingScreen', () => {
    let unmount: (() => void) | undefined;

    const renderTradingScreen = (preloadedState?: Record<string, unknown>) => {
        const result = renderWithStoreProvider(<TradingScreen />, { preloadedState });

        ({ unmount } = result);

        return result;
    };

    afterEach(() => {
        if (unmount) {
            unmount();
            unmount = undefined;
        }
    });

    const expectBuyForm = () => {
        expect(screen.getByText('You pay')).toBeOnTheScreen();
    };

    it('should render nothing when trading feature flag is not enabled', () => {
        const { toJSON } = renderTradingScreen(stateWithDisabledTrading);

        expect(toJSON()).toBeNull();
    });

    it('should render Buy form by default', () => {
        renderTradingScreen(stateWithEnabledBuy);

        expectBuyForm();
    });
});
