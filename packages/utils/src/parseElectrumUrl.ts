// Todo: one day, we shall purify the @trezor/utils and remove domain-specific stuff from it

// URL is in format host:port:[t|s] (t for tcp, s for ssl)
const ELECTRUM_URL_REGEX = /^(?:([a-zA-Z0-9.-]+)|\[([a-f0-9:]+)\]):([0-9]{1,5}):([ts])$/;

export const parseElectrumUrl = (url: string) => {
    const match = url.match(ELECTRUM_URL_REGEX);
    if (!match) return undefined;

    const host = match[1] ?? match[2];
    const port = match[3];
    const protocol = match[4];
    if (host === undefined || port === undefined || protocol === undefined) return undefined;

    return {
        host,
        port: Number.parseInt(port, 10),
        protocol: protocol as 't' | 's',
    };
};
