import { useMemo } from 'react';

import styled, { css } from 'styled-components';

import { type NetworkSymbol, getCoingeckoId } from '@suite-common/wallet-config';
import { Text } from '@trezor/components';
import { type SpacingValuesNew, borders } from '@trezor/theme';

import { mapSizeToTypographyStyle } from './utils';
import { AssetLogo, type AssetLogoSize } from '../AssetLogo/AssetLogo';

export type TokenIconSetProps = {
    symbol: NetworkSymbol;
    tokens: { contract: string; symbol?: string }[]; // tokens represented by their contract addresses and symbols
    size: AssetLogoSize;
    gap: SpacingValuesNew;
    isCountVisible?: boolean;
    maxVisibleTokens?: number;
    isCentered?: boolean;
    /**
     * If true, visible tokens will be displayed from the last token to the first.
     */
    reverseVisibleTokens?: boolean;
};

const Container = styled.div<{
    $length: number;
    $size: AssetLogoSize;
    $gap: SpacingValuesNew;
    $isCountVisible: boolean;
    $isCentered: boolean;
    $maxVisibleTokens: number;
}>`
    justify-content: center;
    display: flex;
    align-items: center;

    ${({ $isCentered, $size, $gap, $length, $isCountVisible, $maxVisibleTokens }) => {
        const visibleCount =
            $length > $maxVisibleTokens ? $maxVisibleTokens + Number($isCountVisible) : $length;

        return $isCentered
            ? css`
                  width: ${$size}px;
              `
            : css`
                  width: ${$size + (visibleCount - 1) * $gap}px;
              `;
    }}

    ${({ $length, $gap, $isCountVisible, $maxVisibleTokens }) =>
        $length > 1 &&
        css`
            display: grid;
            grid-template-columns: repeat(
                ${$length > $maxVisibleTokens
                    ? $maxVisibleTokens + Number($isCountVisible)
                    : $length},
                ${$gap}px
            );
            justify-items: center;
        `}
`;

const IconWrapper = styled.div<{ $size: number; $gap: number; $length: number }>`
    border-radius: ${borders.radii.full};

    ${({ $size, $gap, $length }) =>
        $length > 1 &&
        css`
            &:not(:last-child) {
                mask: radial-gradient(
                    circle at calc(50% + ${$gap}px) 50%,
                    transparent ${$size / 2 + 2}px,
                    black ${$size / 2 + 2}px
                );
            }
        `}
`;

const CountContainer = styled.div<{ $size: AssetLogoSize }>`
    ${({ $size }) => css`
        width: ${$size}px;
        height: ${$size}px;
    `}

    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: ${borders.radii.full};
    background: ${({ theme }) => theme.backgroundTertiaryDefaultOnElevationNegative};
`;

export const TokenIconSet = ({
    symbol,
    tokens,
    size,
    gap,
    isCountVisible = false,
    maxVisibleTokens = 3,
    isCentered = false,
    reverseVisibleTokens = true,
}: TokenIconSetProps) => {
    const { length } = tokens;

    const visibleTokensContent = useMemo(() => {
        const visibleTokens = tokens.slice(0, maxVisibleTokens);
        const orderedTokens = reverseVisibleTokens ? visibleTokens.reverse() : visibleTokens;
        const coingeckoId = getCoingeckoId(symbol);

        return orderedTokens?.map(token => (
            <IconWrapper key={token.contract} $size={size} $gap={gap} $length={length}>
                <AssetLogo
                    size={size}
                    coingeckoId={coingeckoId ?? ''}
                    symbol={symbol}
                    contractAddress={token.contract}
                    placeholder={token.symbol ?? ''}
                    placeholderWithTooltip={false}
                />
            </IconWrapper>
        ));
    }, [tokens, reverseVisibleTokens, symbol, size, gap, length, maxVisibleTokens]);

    if (length === 0) {
        return null;
    }

    return (
        <Container
            $length={length}
            $size={size}
            $gap={gap}
            $maxVisibleTokens={maxVisibleTokens}
            $isCountVisible={isCountVisible}
            $isCentered={isCentered}
        >
            {visibleTokensContent}
            {length > maxVisibleTokens && isCountVisible && (
                <CountContainer $size={size}>
                    <Text typographyStyle={mapSizeToTypographyStyle(size)} intent="neutral">
                        +{length - maxVisibleTokens}
                    </Text>
                </CountContainer>
            )}
        </Container>
    );
};
