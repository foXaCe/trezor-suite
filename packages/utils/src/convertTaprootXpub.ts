// Todo: one day, we shall purify the @trezor/utils and remove domain-specific stuff from it

export type ConvertTaprootXpubParams = {
    xpub: string;
    direction: 'h-to-apostrophe' | 'apostrophe-to-h';
};

export const convertTaprootXpub = ({ xpub, direction }: ConvertTaprootXpubParams) => {
    const find = direction === 'h-to-apostrophe' ? 'h' : "'";
    const replace = direction === 'h-to-apostrophe' ? "'" : 'h';

    const openingSquareBracketSplit = xpub.split('[');
    const beforeOpeningBracket = openingSquareBracketSplit[0];
    const afterOpeningBracket = openingSquareBracketSplit[1];
    if (openingSquareBracketSplit.length === 2 && afterOpeningBracket !== undefined) {
        const closingSquareBracketSplit = afterOpeningBracket.split(']');
        const path = closingSquareBracketSplit[0];
        const afterClosingBracket = closingSquareBracketSplit[1];
        if (
            closingSquareBracketSplit.length === 2 &&
            path !== undefined &&
            afterClosingBracket !== undefined
        ) {
            const correctedPath = path.replace(new RegExp(find, 'g'), replace); // .replaceAll()

            return `${beforeOpeningBracket}[${correctedPath}]${afterClosingBracket}`;
        }
    }

    return null;
};
