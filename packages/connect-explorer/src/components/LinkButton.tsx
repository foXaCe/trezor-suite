import type { ComponentProps } from 'react';

import Link from 'next/link';
import styled from 'styled-components';

import { Button } from '@trezor/components';

const StyledLink = styled(Link)`
    text-decoration: none;
`;

type LinkButtonProps = Omit<ComponentProps<typeof Button>, 'href' | 'target'> & {
    href: string;
};

export const LinkButton = ({ href, children, ...props }: LinkButtonProps) => (
    <StyledLink href={href}>
        <Button {...props}>{children}</Button>
    </StyledLink>
);
