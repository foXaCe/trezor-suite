import type { ComponentProps } from 'react';

import { useRouter } from 'next/router';

import { Button } from '@trezor/components';

type LinkButtonProps = Omit<ComponentProps<typeof Button>, 'target'> & {
    href: string;
};

export const LinkButton = ({ href, children, ...props }: LinkButtonProps) => {
    const router = useRouter();

    return (
        <Button
            {...props}
            href={href}
            target="_self"
            onClick={e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                void router.push(href);
            }}
        >
            {children}
        </Button>
    );
};
