import { configureMockStore } from '@suite-common/test-utils';

import { notificationsActions } from '../notificationsActions';
import { createNotificationsReducer } from '../notificationsReducer';
import { selectNotifications } from '../notificationsSelectors';
import { removeAccountEventsThunk, removeTransactionEventsThunk } from '../notificationsThunks';
import { type NotificationsRootState, type NotificationsState } from '../types';

const { reducer: notificationsReducer } = createNotificationsReducer();

interface InitStoreArgs {
    preloadedState?: NotificationsRootState;
}

const initStore = ({ preloadedState }: InitStoreArgs = {}) => {
    const store = configureMockStore({
        reducer: { notifications: notificationsReducer },
        preloadedState,
    });

    return store;
};

const mockedNotifications: NotificationsState = [
    {
        context: 'toast',
        id: 1,
        device: undefined,
        seen: false,
        type: 'qr-incorrect-address',
    },
    {
        context: 'toast',
        id: 2,
        device: undefined,
        seen: false,
        type: 'copy-to-clipboard',
    },
    {
        context: 'toast',
        id: 3,
        device: undefined,
        seen: false,
        type: 'tx-sent',
        formattedAmount: '0',
        descriptor: 'xpub',
        symbol: 'btc',
        txid: 'abcd',
    },
];

describe('Notifications Actions', () => {
    it('add notifications', () => {
        const store = initStore();
        store.dispatch(
            notificationsActions.addToast({
                type: 'tx-sent',
                formattedAmount: '0',
                descriptor: 'xpub',
                symbol: 'btc',
                txid: 'abcd',
            }),
        );
        expect(store.getState().notifications.length).toEqual(1);
        store.dispatch(notificationsActions.addToast({ type: 'copy-to-clipboard' }));
        expect(store.getState().notifications.length).toEqual(2);
    });

    it('close notification by id', () => {
        const store = initStore({
            preloadedState: {
                notifications: mockedNotifications,
            },
        });
        store.dispatch(notificationsActions.close(1));
        store.dispatch(notificationsActions.close(10)); // does not exists

        expect(selectNotifications(store.getState()).filter(n => !n.closed).length).toEqual(2);
        expect(selectNotifications(store.getState()).filter(n => n.closed).length).toEqual(1);
    });

    it('reset all notifications to unseen', () => {
        const store = initStore({ preloadedState: { notifications: mockedNotifications } });

        selectNotifications(store.getState()).forEach(n => expect(n.seen).toEqual(false));

        store.dispatch(notificationsActions.resetUnseen());

        selectNotifications(store.getState()).forEach(n => expect(n.seen).toEqual(true));
    });

    it('reset specific notification to unseen', () => {
        const store = initStore({ preloadedState: { notifications: mockedNotifications } });

        expect(selectNotifications(store.getState())[0]).toHaveProperty('seen', false);
        expect(selectNotifications(store.getState())[1]).toHaveProperty('seen', false);

        const firstNotification = selectNotifications(store.getState())[0];
        if (firstNotification) {
            store.dispatch(notificationsActions.resetUnseen([firstNotification]));
        }

        expect(selectNotifications(store.getState())[0]).toHaveProperty('seen', true);
        expect(selectNotifications(store.getState())[1]).toHaveProperty('seen', false);
    });

    it('remove specific notification', () => {
        const store = initStore({ preloadedState: { notifications: mockedNotifications } });

        const toRemove = mockedNotifications[0];
        if (toRemove) {
            store.dispatch(notificationsActions.remove(toRemove));
        }

        expect(selectNotifications(store.getState())).toHaveLength(2);
        const mocked1 = mockedNotifications[1];
        const mocked2 = mockedNotifications[2];
        if (mocked1) expect(selectNotifications(store.getState())[0]).toMatchObject(mocked1);
        if (mocked2) expect(selectNotifications(store.getState())[1]).toMatchObject(mocked2);
    });

    it('remove multiple specific notifications', () => {
        const store = initStore({ preloadedState: { notifications: mockedNotifications } });

        const notificationsToRemove = [mockedNotifications[0], mockedNotifications[1]].filter(
            (n): n is NonNullable<typeof n> => n !== undefined,
        );
        store.dispatch(notificationsActions.remove(notificationsToRemove));

        expect(selectNotifications(store.getState())).toHaveLength(1);
        const mocked2 = mockedNotifications[2];
        if (mocked2) expect(selectNotifications(store.getState())[0]).toMatchObject(mocked2);
    });

    it('removeTransactionEvents', async () => {
        const store = initStore({
            preloadedState: {
                notifications: [
                    {
                        id: 1,
                        context: 'toast',
                        type: 'tx-sent',
                        formattedAmount: '0',
                        descriptor: 'xpub',
                        symbol: 'btc',
                        txid: '1',
                    },
                    {
                        id: 2,
                        context: 'event',
                        type: 'tx-confirmed',
                        formattedAmount: '0',
                        descriptor: 'xpub',
                        symbol: 'btc',
                        txid: '2',
                    },
                    {
                        id: 3,
                        context: 'event',
                        type: 'tx-received',
                        formattedAmount: '0',
                        descriptor: 'xpub',
                        symbol: 'btc',
                        txid: '3',
                    },
                    {
                        id: 4,
                        context: 'toast',
                        type: 'backup-success',
                    },
                ],
            },
        });
        await store.dispatch(removeTransactionEventsThunk([{ txid: '1' }, { txid: '2' }]));
        expect(store.getState().notifications.length).toEqual(2);
        await store.dispatch(removeTransactionEventsThunk([{ txid: '3' }]));
        expect(store.getState().notifications.length).toEqual(1);
    });

    it('removeAccountEvents', async () => {
        const store = initStore({
            preloadedState: {
                notifications: [
                    {
                        id: 1,
                        context: 'toast',
                        type: 'tx-sent',
                        formattedAmount: '0',
                        descriptor: 'xpub',
                        symbol: 'btc',
                        txid: '1',
                    },
                    {
                        id: 2,
                        context: 'event',
                        type: 'tx-confirmed',
                        formattedAmount: '0',
                        descriptor: 'xpub',
                        symbol: 'btc',
                        txid: '2',
                    },
                    {
                        id: 3,
                        context: 'event',
                        type: 'tx-received',
                        formattedAmount: '0',
                        descriptor: 'xpub',
                        symbol: 'btc',
                        txid: '3',
                    },
                    {
                        id: 4,
                        context: 'toast',
                        type: 'backup-success',
                    },
                ],
            },
        });
        await store.dispatch(removeAccountEventsThunk('xpub'));
        expect(store.getState().notifications.length).toEqual(1);
    });
});
