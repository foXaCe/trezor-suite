import { type ProviderMetadata } from 'invity-api';
import styled from 'styled-components';

import { Translation } from '@suite/intl';
import { invityAPI } from '@suite-common/trading';
import { Box, Column, Row, Text } from '@trezor/components';
import { borders } from '@trezor/theme';

interface AllowanceModalProviderInfoProps {
    provider: ProviderMetadata;
    spender: string;
}

const ProviderLogo = styled.img`
    flex: none;
    width: 24px;
    height: 24px;
`;

const getProviderLogoSource = (logo?: string) => {
    if (!logo) {
        return null;
    }

    return logo.startsWith('http://') || logo.startsWith('https://')
        ? logo
        : invityAPI.getProviderLogoUrl(logo);
};

export const AllowanceModalProviderInfo = ({
    provider,
    spender,
}: AllowanceModalProviderInfoProps) => {
    const providerLogoSource = getProviderLogoSource(provider.logo);
    const providerName = provider.companyName ?? provider.name;

    return (
        <Box padding={12} borderWidth={borders.widths.large} borderRadius={borders.radii.sm}>
            <Column gap={12}>
                <Text>
                    <Translation id="TR_EXCHANGE_APPROVAL_PROVIDER" />
                </Text>
                <Row gap={8}>
                    {providerLogoSource && <ProviderLogo src={providerLogoSource} alt="" />}
                    <Column>
                        {providerName && <Text>{providerName}</Text>}
                        <Text typographyStyle="body-sm" intent="neutral" priority="secondary">
                            {spender}
                        </Text>
                    </Column>
                </Row>
            </Column>
        </Box>
    );
};
