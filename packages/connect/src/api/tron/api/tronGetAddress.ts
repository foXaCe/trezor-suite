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
import { fromHardened, getSerializedPath, validatePath } from '../../../utils/pathUtils';
import { bundlify } from '../../common/paramsValidator';

type Params = {
    proto: PROTO.TronGetAddress;
    address?: string;
};

export default class TronGetAddress extends AbstractMethod<'tronGetAddress', Params[]> {
    hasBundle?: boolean;
    progress = 0;

    constructor(message: MethodMessage<'tronGetAddress'>) {
        const { hasBundle, payload } = bundlify(message.payload);

        // validate bundle type
        Assert(Bundle(GetAddressSchema), payload);

        const params = payload.bundle.map(batch => {
            const path = validatePath(batch.path, 2);

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
        this.requiredDeviceCapabilities = ['Capability_Tron'];
    }

    get requiredPermissions(): MethodPermission[] {
        return ['read'];
    }

    get info() {
        if (this.params.length === 1) {
            return 'Export Tron address';
        }

        return 'Export multiple Tron addresses';
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
            label: (() => {
                if (this.params.length > 1) {
                    return 'Export multiple Tron addresses';
                }
                // @ts-expect-error: indexing with noUncheckedIndexedAccess
                const param = this.params[0];

                return `Export Tron address for account #${fromHardened(param.proto.address_n[2]) + 1}`;
            })(),
        };
    }

    async _call({ proto }: Params) {
        const cmd = this.getDevice().getCommands();
        const response = await cmd.typedCall('TronGetAddress', 'TronAddress', proto);

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
                    // save address for future verification in "getButtonRequestData"
                    // @ts-expect-error: indexing with noUncheckedIndexedAccess
                    batch.address = silent.address;
                }
            }

            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            const message = await this._call(batch);
            responses.push({
                // @ts-expect-error: indexing with noUncheckedIndexedAccess
                path: batch.proto.address_n,
                // @ts-expect-error: indexing with noUncheckedIndexedAccess
                serializedPath: getSerializedPath(batch.proto.address_n),
                address: message.address,
                mac: message.mac,
            });

            if (this.hasBundle) {
                // send progress
                sendCoreMessage(
                    createUiMessage(UI_REQUEST.BUNDLE_PROGRESS, {
                        total: this.params.length,
                        progress: i,
                        response: message,
                    }),
                );
            }

            this.progress++;
        }

        return this.hasBundle ? responses : responses[0];
    }
}
