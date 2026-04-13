/// <reference lib="webworker" />

import { SessionsBackground } from './background';
import { type HandleMessageParams } from './types';

declare let self: SharedWorkerGlobalScope;

const background = new SessionsBackground();

const ports: MessagePort[] = [];

const handleMessage = async (message: HandleMessageParams, port: MessagePort) => {
    const res = await background.handleMessage(message);
    port.postMessage(res);
};

background.on('descriptors', descriptors => {
    ports.forEach(p => {
        p.postMessage({ type: 'descriptors', payload: descriptors });
    });
});

background.on('releaseRequest', descriptor => {
    ports.forEach(p => {
        p.postMessage({ type: 'releaseRequest', payload: descriptor });
    });
});

self.onconnect = function (e) {
    const port = e.ports[0];

    // @ts-expect-error: indexing with noUncheckedIndexedAccess
    ports.push(port);

    // @ts-expect-error: indexing with noUncheckedIndexedAccess
    port.addEventListener('message', e => {
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        handleMessage(e.data, port);
    });

    // @ts-expect-error: indexing with noUncheckedIndexedAccess
    port.start();
};
