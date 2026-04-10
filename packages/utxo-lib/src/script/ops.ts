import * as ops from 'bitcoin-ops';

// extend with Decred OP codes
const OPS: { [key: string]: number } & typeof ops & {
        OP_SSTX: number;
        OP_SSTXCHANGE: number;
        OP_SSGEN: number;
        OP_SSRTX: number;
    } = {
    ...ops,
    OP_SSTX: 0xba,
    OP_SSTXCHANGE: 0xbd,
    OP_SSGEN: 0xbb,
    OP_SSRTX: 0xbc,
};

const REVERSE_OPS: string[] = [];
Object.keys(OPS).forEach(code => {
    const value = OPS[code];
    if (value !== undefined) {
        REVERSE_OPS[value] = code;
    }
});

export { OPS, REVERSE_OPS };
