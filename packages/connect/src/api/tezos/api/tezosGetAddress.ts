// origin: https://github.com/trezor/connect/blob/develop/src/js/core/methods/TezosGetAddress.js

import {
    Bundle,
    GetAddress as GetAddressSchema,
    UI_REQUEST,
    createUiMessage,
} from '@trezor/connect-common';
import type { PROTO } from '@trezor/connect-common';
import { ERRORS } from '@trezor/connect-common/src/constants';
import { Assert } from '@trezor/schema-utils';

import type {
    MethodContext,
    MethodMessage,
    MethodPermission,
    MethodReturnType,
} from '../../../core/AbstractMethod';
import { AbstractMethod } from '../../../core/AbstractMethod';
import { getMiscNetwork } from '../../../data/coinInfo';
import { fromHardened, getSerializedPath, validatePath } from '../../../utils/pathUtils';
import { bundlify, getFirmwareRange } from '../../common/paramsValidator';

type Params = {
    proto: PROTO.TezosGetAddress;
    address?: string;
};

export default class TezosGetAddress extends AbstractMethod<'tezosGetAddress', Params[]> {
    hasBundle?: boolean;
    progress = 0;

    constructor(message: MethodMessage<'tezosGetAddress'>) {
        const { hasBundle, payload } = bundlify(message.payload);

        // validate bundle type
        Assert(Bundle(GetAddressSchema), payload);

        const params = payload.bundle.map(batch => {
            const path = validatePath(batch.path, 3);

            const proto = {
                address_n: path,
                show_display: typeof batch.showOnTrezor === 'boolean' ? batch.showOnTrezor : true,
                chunkify: typeof batch.chunkify === 'boolean' ? batch.chunkify : false,
            };

            return { proto, address: batch.address };
        });

        super(message, params);

        this.hasBundle = hasBundle;
        this.useUi = this.getUseUi(this.params, payload.useEventListener);
        this.confirmMissingBackup = true;
        this.requiredDeviceCapabilities = ['Capability_Tezos'];
        this.firmwareRange = getFirmwareRange(
            this.name,
            getMiscNetwork('Tezos'),
            this.firmwareRange,
        );
    }

    get requiredPermissions(): MethodPermission[] {
        return ['read'];
    }

    get info() {
        if (this.params.length === 1) {
            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            const param = this.params[0];

            return `Export Tezos address for account #${fromHardened(param.proto.address_n[2]) + 1}`;
        }

        return 'Export multiple Tezos addresses';
    }

    getButtonRequestData(code: string) {
        if (code === 'ButtonRequest_Address') {
            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            const param = this.params[this.progress];

            return {
                type: 'address' as const,
                serializedPath: getSerializedPath(param.proto.address_n),
                address: param.address || 'not-set',
            };
        }
    }

    get confirmation() {
        return {
            view: 'export-address' as const,
            label: this.info,
        };
    }

    async _call({ proto }: Params) {
        const cmd = this.getDevice().getCommands();
        const response = await cmd.typedCall('TezosGetAddress', 'TezosAddress', proto);

        return response.message;
    }

    // @ts-expect-error: indexing with noUncheckedIndexedAccess
    async run({ sendCoreMessage }: MethodContext) {
        const responses: MethodReturnType<typeof this.name> = [];

        for (let i = 0; i < this.params.length; i++) {
            const batch = this.params[i];
            // silently get address and compare with requested address
            // or display as default inside popup
            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            if (batch.proto.show_display) {
                const silent = await this._call({
                    ...batch,
                    // @ts-expect-error: indexing with noUncheckedIndexedAccess
                    proto: { ...batch.proto, show_display: false },
                });
                // @ts-expect-error: indexing with noUncheckedIndexedAccess
                if (typeof batch.address === 'string') {
                    // @ts-expect-error: indexing with noUncheckedIndexedAccess
                    if (batch.address !== silent.address) {
                        throw ERRORS.TypedError('Method_AddressNotMatch');
                    }
                } else {
                    // @ts-expect-error: indexing with noUncheckedIndexedAccess
                    batch.address = silent.address;
                }
            }

            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            const response = await this._call(batch);
            responses.push({
                // @ts-expect-error: indexing with noUncheckedIndexedAccess
                path: batch.proto.address_n,
                // @ts-expect-error: indexing with noUncheckedIndexedAccess
                serializedPath: getSerializedPath(batch.proto.address_n),
                address: response.address,
                mac: response.mac,
            });

            if (this.hasBundle) {
                // send progress
                sendCoreMessage(
                    createUiMessage(UI_REQUEST.BUNDLE_PROGRESS, {
                        total: this.params.length,
                        progress: i,
                        response,
                    }),
                );
            }

            this.progress++;
        }

        return this.hasBundle ? responses : responses[0];
    }
}
