import type { HandshakeElectron } from '@trezor/suite-desktop-api';

import * as DESKTOP_UPDATE from './desktopUpdateConstants';
import { UpdateState, desktopUpdateReducer } from './desktopUpdateReducer';
import type { DesktopUpdateAction, DesktopUpdateState } from './desktopUpdateReducer';

const createUpdateInfo = (salt: string) => ({
    releaseDate: `releaseDate-${salt}`,
    version: `version-${salt}`,
});

const createDesktopHandshakeAction = (desktopUpdate?: HandshakeElectron['desktopUpdate']) => ({
    type: '@suite/desktop-handshake' as const,
    payload: {
        desktopUpdate,
        paths: { userDir: '', binDir: '' },
        urls: { httpReceiver: '' },
    } satisfies HandshakeElectron,
});

const fixtures: [
    DesktopUpdateAction | ReturnType<typeof createDesktopHandshakeAction>,
    Partial<DesktopUpdateState>,
][] = [
    [
        createDesktopHandshakeAction({
            allowPrerelease: true,
            isAutomaticUpdateEnabled: false,
        }),
        { enabled: true, allowPrerelease: true },
    ],
    [{ type: DESKTOP_UPDATE.ALLOW_PRERELEASE, payload: false }, { allowPrerelease: false }],
    [{ type: DESKTOP_UPDATE.CHECKING }, { state: UpdateState.Checking }],
    [
        { type: DESKTOP_UPDATE.AVAILABLE, payload: createUpdateInfo('a') },
        { state: UpdateState.Available, latest: createUpdateInfo('a') },
    ],
    [
        { type: DESKTOP_UPDATE.NOT_AVAILABLE, payload: createUpdateInfo('b') },
        { state: UpdateState.NotAvailable, latest: createUpdateInfo('b') },
    ],
    [{ type: DESKTOP_UPDATE.DOWNLOAD }, { state: UpdateState.Downloading }],
    [{ type: DESKTOP_UPDATE.DOWNLOADING, payload: { percent: 42 } }, { progress: { percent: 42 } }],
    [
        { type: DESKTOP_UPDATE.READY, payload: createUpdateInfo('c') },
        { state: UpdateState.Ready, latest: createUpdateInfo('c') },
    ],
    [
        { type: DESKTOP_UPDATE.OPEN_EARLY_ACCESS_ENABLE },
        { state: UpdateState.EarlyAccessEnable, isModalVisible: true },
    ],
    [{ type: DESKTOP_UPDATE.MODAL_VISIBILITY, payload: false }, { isModalVisible: false }],
    [
        { type: DESKTOP_UPDATE.OPEN_EARLY_ACCESS_DISABLE },
        { state: UpdateState.EarlyAccessDisable, isModalVisible: true },
    ],
];

describe('desktopUpdateReducer', () => {
    it('handles desktop update actions', () => {
        let lastState: DesktopUpdateState | undefined;

        fixtures.forEach(([action, state]) => {
            lastState = desktopUpdateReducer(lastState, action);
            expect(lastState).toMatchObject(state);
        });
    });
});
