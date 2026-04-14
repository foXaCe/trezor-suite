import type { MessagesSchema as PROTO } from '@trezor/protobuf';
import { addDescriptorChecksum } from './checksum';

const PURPOSE_SLIP25 = 10025;

const SCRIPT_TYPE_TO_PURPOSES: Partial<Record<PROTO.InternalInputScriptType, number[]>> = {
    SPENDADDRESS: [44],
    SPENDP2SHWITNESS: [49],
    SPENDWITNESS: [84],
    SPENDTAPROOT: [86, PURPOSE_SLIP25],
    SPENDMULTISIG: [44],
};

const PURPOSE_TO_SCRIPT_TYPE: Record<number, PROTO.InternalInputScriptType> = {
    44: 'SPENDADDRESS',
    49: 'SPENDP2SHWITNESS',
    84: 'SPENDWITNESS',
    86: 'SPENDTAPROOT',
    [PURPOSE_SLIP25]: 'SPENDTAPROOT',
};

type BuildOutputDescriptorBip380Params = {
    coin?: string;
    account: number;
    purpose?: number;
    scriptType?: PROTO.InternalInputScriptType;
    xpub: string;
    rootFingerprint?: number;
    descriptor?: string;
};

export const buildOutputDescriptor = ({
    coin,
    account,
    purpose,
    scriptType,
    xpub,
    rootFingerprint,
    descriptor,
}: BuildOutputDescriptorBip380Params): string | undefined => {
    if (descriptor !== undefined) return descriptor;

    if (purpose === undefined) {
        scriptType ??= 'SPENDADDRESS';
        purpose = SCRIPT_TYPE_TO_PURPOSES[scriptType]![0];
    } else if (scriptType === undefined) {
        scriptType = PURPOSE_TO_SCRIPT_TYPE[purpose];
        // If we cannot build properly the output descriptor we return undefined.
        if (!scriptType) return undefined;
    } else if (!SCRIPT_TYPE_TO_PURPOSES[scriptType]?.includes(purpose)) {
        return undefined;
    }

    const resolvedCoin = coin ?? 'Bitcoin';
    let coinType: number;
    if (resolvedCoin === 'Bitcoin') coinType = 0;
    else if (resolvedCoin === 'Testnet' || resolvedCoin === 'Regtest') coinType = 1;
    else return undefined;

    let path = `m/${purpose}h/${coinType}h/${account}h`;
    if (purpose === PURPOSE_SLIP25) {
        if (scriptType === 'SPENDTAPROOT') path += "/1'";
        else return undefined;
    }

    const fmtMap: Record<PROTO.InternalInputScriptType, string> = {
        SPENDADDRESS: 'pkh({})',
        SPENDP2SHWITNESS: 'sh(wpkh({}))',
        SPENDWITNESS: 'wpkh({})',
        SPENDTAPROOT: 'tr({})',
        SPENDMULTISIG: 'pkh({})',
    };

    const fmt = fmtMap[scriptType];
    const fingerprint = rootFingerprint ?? 0;
    console.log('fingerprint before padStart', fingerprint);
    const inner = `[${fingerprint.toString(16).padStart(8, '0')}${path.slice(1)}]${xpub}/<0;1>/*`;

    return addDescriptorChecksum(fmt.replace('{}', inner));
};
