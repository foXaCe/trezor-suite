import { FreeFocusInside } from 'react-focus-lock';

import styled from 'styled-components';

import { Icon } from '@trezor/components';
import { zIndices } from '@trezor/theme';

import { useGuide } from 'src/hooks/guide';

const Wrapper = styled.button<{ $isGuideOpen: boolean }>`
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    z-index: ${zIndices.guideButton};
    bottom: 15px;
    right: 15px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    border: solid 1px ${({ theme }) => theme.borderElevation0};
    background: ${({ theme }) => theme.backgroundTertiaryDefaultOnElevation0};
    transition: opacity 0.3s ease 0.3s;
    opacity: ${({ $isGuideOpen }) => ($isGuideOpen ? 0 : 1)};
    box-shadow: 0 2px 4px 0 rgb(134 64 64 / 4%);

    &:focus,
    &:hover {
        background: ${({ theme }) => theme.backgroundTertiaryPressedOnElevation0};
        transition: opacity 0.1s ease; /* hide button faster on guide open to prevent overlap */
    }

    > img {
        display: block;
    }
`;

export const GuideButton = () => {
    const { openGuide, isGuideOpen } = useGuide();

    return (
        <FreeFocusInside>
            <Wrapper
                data-testid="@guide/button-open"
                onClick={openGuide}
                $isGuideOpen={isGuideOpen}
            >
                <Icon size={24} name="lifebuoy" />
            </Wrapper>
        </FreeFocusInside>
    );
};
