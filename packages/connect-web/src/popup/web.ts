import { type CoreEventMessage } from '@trezor/connect-common/src/events';
import { type AbstractMessageChannel } from '@trezor/connect-common/src/messageChannel/abstract';
import { WindowWindowChannel } from '@trezor/connect-common/src/messageChannel/window-window';
import { getWeakRandomId } from '@trezor/utils/src/getWeakRandomId';

import { Popup } from './abstract';
import { getIframeInstance } from './iframe';

export class WebPopup extends Popup {
    private popupWindow: Window | undefined;
    private iframe = getIframeInstance();
    private channelId = getWeakRandomId(16);

    protected createChannel(origin: string): AbstractMessageChannel<CoreEventMessage> {
        return new WindowWindowChannel<CoreEventMessage>({
            windowHere: window,
            windowPeer: () => this.iframe.get()?.contentWindow || undefined,
            channel: {
                here: '@trezor/connect-web',
                peer: '@trezor/connect-popup',
            },
            logger: this.logger,
            origin,
        });
    }

    protected async open(): Promise<void> {
        // const url = this.buildPopupUrl(this.popupSrc);
        const url =
            'https://dev.suite.sldev.cz/suite-web/feat/connect-web-iframe-2/web/connect-popup';
        const query = `connect-popup-req=${this.channelId}`;
        const iframeUrl = `${url}/iframe.html?${query}`;
        const popupUrl = `${url}/?${query}`;

        const windowResult = window.open(popupUrl, 'modal');

        console.log('Popup window opened:', popupUrl);

        if (!windowResult) {
            this.handleOpenFailure('Popup window blocked by browser');

            return Promise.resolve();
        }

        this.popupWindow = windowResult;

        try {
            await this.iframe.create(iframeUrl);
        } catch (error) {
            this.handleOpenFailure('iframe creation error: ' + error.message);

            return Promise.resolve();
        }

        if (!this.channel.isConnected) {
            this.channel.connect();
        }

        this.startCloseMonitoring();

        return Promise.resolve();
    }

    protected focusPopup(): void {
        this.popupWindow?.focus();
    }

    protected closePopup(): void {
        this.popupWindow?.close();
        this.popupWindow = undefined;
    }

    protected isOpen(): Promise<boolean> {
        return Promise.resolve(this.popupWindow !== undefined);
    }

    protected onReset(): void {}
}
