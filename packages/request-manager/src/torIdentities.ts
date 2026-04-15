import { SocksProxyAgent } from 'socks-proxy-agent';

import type { TorSettings } from './types';

export class TorIdentities {
    private readonly getTorSettings: () => TorSettings;
    private readonly identities: { [key: string]: SocksProxyAgent };
    private readonly passwords: { [key: string]: string };

    constructor(getTorSettings: () => TorSettings) {
        this.getTorSettings = getTorSettings;
        this.identities = {};
        this.passwords = {};
    }

    public getIdentity(
        identity: string,
        timeout?: number,
        protocol?: 'http' | 'https',
    ): SocksProxyAgent {
        const [user, password] = identity.split(':');

        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        if (password && this.passwords[user] !== password) {
            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            if (this.identities[user]) {
                // @ts-expect-error: indexing with noUncheckedIndexedAccess
                this.removeIdentity(user);
            }
            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            this.passwords[user] = password;
        }

        const { host, port } = this.getTorSettings();

        // TODO clean agents when host/port changes?
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        if (!this.identities[user]) {
            const socksServerUrl = new URL(`socks://${host}:${port}`);
            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            socksServerUrl.username = user;
            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            socksServerUrl.password = password;
            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            this.identities[user] = new SocksProxyAgent(socksServerUrl, {
                timeout,
            });
        }

        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        const agent = this.identities[user];

        // @sentry/node (used in suite-desktop) is wrapping each outgoing request
        // and requires protocol to be explicitly set to https while using TOR + https/wss address combination
        if (protocol) agent.protocol = `${protocol}:`;

        return agent;
    }

    public removeIdentity(user: string) {
        // looks like destroy does nothing, but just in case
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        const identitie: SocksProxyAgent = this.identities[user];
        identitie.destroy();
        delete this.identities[user];
        delete this.passwords[user];
    }
}
