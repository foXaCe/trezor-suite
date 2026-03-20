import { useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { Translation, type TranslationKey } from '@suite/intl';
import { selectTokenDefinitions } from '@suite-common/token-definitions';
import { type NetworkSymbol } from '@suite-common/wallet-config';
import { Box, Card, Column, IconButton, Row, Switch, Text, motionEasing } from '@trezor/components';
import { CoinLogo, TokenIconSet } from '@trezor/product-components';

import { useSelector } from 'src/hooks/suite';

type CoinCardProps = {
    symbol: NetworkSymbol;
    name: string;
    label?: TranslationKey;
    isEnabled: boolean;
    isDisabled: boolean;
    onClick: (symbol: NetworkSymbol, isEnabled?: boolean) => void;
    onToggle?: (symbol: NetworkSymbol, isEnabled?: boolean) => void;
    onSettings?: (symbol: NetworkSymbol) => void;
};

export const CoinCard = ({
    symbol,
    name,
    label,
    isEnabled,
    isDisabled,
    onClick,
    onToggle,
    onSettings,
}: CoinCardProps) => {
    const [isSettingsButtonVisible, setIsSettingsButtonVisible] = useState(false);
    const coinDefinitions = useSelector(selectTokenDefinitions);

    const tokens = coinDefinitions?.[symbol]?.coin?.data?.map(contract => ({
        contract,
    }));

    return (
        <Box
            opacity={isDisabled ? 0.5 : 1}
            width="100%"
            pointerEvents={isDisabled ? 'none' : 'auto'}
        >
            <Card
                key={symbol}
                paddingType="none"
                onClick={() => onClick(symbol, !isEnabled)}
                onMouseEnter={() => setIsSettingsButtonVisible(true)}
                onMouseLeave={() => setIsSettingsButtonVisible(false)}
            >
                <Row padding={{ vertical: 12, horizontal: 16 }} gap={12}>
                    <CoinLogo size={24} symbol={symbol} type="network" />
                    <Column flex="1" minHeight={32} justifyContent="center">
                        <Text typographyStyle="body-sm-strong">{name}</Text>
                        {label && (
                            <Text typographyStyle="body-xs" intent="neutral" priority="secondary">
                                <Translation id={label} />
                            </Text>
                        )}
                    </Column>
                    {tokens?.length ? (
                        <TokenIconSet
                            tokens={tokens}
                            size={24}
                            symbol={symbol}
                            gap={20}
                            maxVisibleTokens={5}
                            reverseVisibleTokens={false}
                        />
                    ) : (
                        <CoinLogo size={24} symbol={symbol} />
                    )}
                    {(onToggle || onSettings) && (
                        <Row margin={{ left: 20 }}>
                            {onToggle && (
                                <Switch
                                    size="medium"
                                    isChecked={isEnabled}
                                    onChange={isChecked => onToggle(symbol, isChecked)}
                                />
                            )}
                            <AnimatePresence>
                                {onSettings && isSettingsButtonVisible && isEnabled && (
                                    <motion.div
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{
                                            duration: 0.3,
                                            ease: motionEasing.transition,
                                        }}
                                    >
                                        <IconButton
                                            size="small"
                                            icon="sliders"
                                            onClick={e => {
                                                e.stopPropagation();
                                                onSettings(symbol);
                                            }}
                                            intent="neutral"
                                            priority="secondary"
                                            margin={{ left: 12 }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Row>
                    )}
                </Row>
            </Card>
        </Box>
    );
};
