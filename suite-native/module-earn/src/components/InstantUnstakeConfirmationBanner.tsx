import { type AccountKey } from '@suite-common/wallet-types';
import { InlineAlertBox, Text, VStack } from '@suite-native/atoms';
import { Translation, useTranslate } from '@suite-native/intl';

import { useInstantUnstakeBanner } from '../hooks/useInstantUnstakeBanner';

type InstantUnstakeConfirmationBannerProps = {
    accountKey: AccountKey;
};

export const InstantUnstakeConfirmationBanner = ({
    accountKey,
}: InstantUnstakeConfirmationBannerProps) => {
    const { translate } = useTranslate();
    const data = useInstantUnstakeBanner(accountKey);

    if (!data) return null;

    const { amount, displaySymbol, unstakingPeriodInDays, dismiss } = data;
    const hasDays = unstakingPeriodInDays !== undefined && unstakingPeriodInDays > 0;

    return (
        <InlineAlertBox
            testID="@staking/instant-unstake-banner"
            variant="info"
            iconName="lightning"
            title={
                <VStack spacing="sp4">
                    <Text variant="body-sm-strong">
                        <Translation
                            id="earn.stakingManagementScreen.instantUnstakeBanner.title"
                            values={{ amount, symbol: displaySymbol }}
                        />
                    </Text>
                    <Text variant="body-sm" color="textSubdued">
                        {hasDays ? (
                            <Translation
                                id="earn.stakingManagementScreen.instantUnstakeBanner.descriptionWithDays"
                                values={{
                                    amount,
                                    symbol: displaySymbol,
                                    days: unstakingPeriodInDays,
                                }}
                            />
                        ) : (
                            <Translation
                                id="earn.stakingManagementScreen.instantUnstakeBanner.descriptionWithoutDays"
                                values={{ amount, symbol: displaySymbol }}
                            />
                        )}
                    </Text>
                </VStack>
            }
            buttonLabel={translate('generic.buttons.gotIt')}
            onButtonPress={dismiss}
            buttonProps={{ testID: '@staking/instant-unstake-banner/got-it-button' }}
        />
    );
};
