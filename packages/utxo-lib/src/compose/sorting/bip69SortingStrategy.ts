import { convertOutput } from './convertOutput';
import { type SortingStrategy } from './sortingStrategy';
import { type CoinSelectOutputFinal, type ComposeInput } from '../../types';

function inputComparator(a: ComposeInput, b: ComposeInput) {
    return Buffer.from(a.txid, 'hex').compare(Buffer.from(b.txid, 'hex')) || a.vout - b.vout;
}

function outputComparator(a: CoinSelectOutputFinal, b: CoinSelectOutputFinal) {
    return (
        a.value.cmp(b.value) ||
        (Buffer.isBuffer(a.script) && Buffer.isBuffer(b.script)
            ? a.script.compare(b.script)
            : a.script.length - b.script.length)
    );
}

export const bip69SortingStrategy: SortingStrategy = ({ result, request, convertedInputs }) => {
    const defaultPermutation: number[] = [];
    const convertedOutputs = result.outputs.map((output, index) => {
        defaultPermutation.push(index);
        const requestOutput = request.outputs[index];
        if (requestOutput) {
            return convertOutput(output, requestOutput);
        }

        return convertOutput(output, { type: 'change', ...request.changeAddress });
    });

    const permutation = defaultPermutation.sort((a, b) => {
        const outputA = result.outputs[a];
        const outputB = result.outputs[b];
        if (!outputA || !outputB) return 0;

        return outputComparator(outputA, outputB);
    });
    const sortedOutputs = permutation.flatMap(index => {
        const output = convertedOutputs[index];

        return output ? [output] : [];
    });

    return {
        inputs: convertedInputs.sort(inputComparator),
        outputs: sortedOutputs,
        outputsPermutation: permutation,
    };
};
