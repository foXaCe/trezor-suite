import { type Network, type NetworkSymbol } from '@suite-common/wallet-config';
import { Column, H4 } from '@trezor/components';

import { CoinList } from 'src/components/suite/CoinList/CoinList';

type SelectNetworkProps = {
    heading: React.ReactNode;
    networks: Network[];
    selectedNetworks: NetworkSymbol[];
    handleNetworkSelection: (symbol?: NetworkSymbol) => void;
};

export const SelectNetwork = ({
    heading,
    networks,
    selectedNetworks,
    handleNetworkSelection,
}: SelectNetworkProps) => {
    if (!networks.length) {
        return null;
    }

    return (
        <Column gap={12}>
            <H4 intent="neutral" priority="secondary" typographyStyle="body-sm">
                {heading}
            </H4>
            <CoinList
                onClick={handleNetworkSelection}
                networks={networks}
                enabledNetworks={selectedNetworks}
            />
        </Column>
    );
};
