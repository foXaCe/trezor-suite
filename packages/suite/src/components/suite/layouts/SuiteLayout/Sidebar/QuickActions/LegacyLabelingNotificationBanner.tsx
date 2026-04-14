import { useState } from 'react';

import { type Variants, motion } from 'framer-motion';

import { Translation } from '@suite/intl';
import { selectDeviceStaticSessionId } from '@suite-common/device';
import { selectIsSuiteSyncFeatureAvailable } from '@suite-common/suite-sync';
import {
    Button,
    Card,
    Column,
    ElevationContext,
    Icon,
    Row,
    Text,
    TextButton,
} from '@trezor/components';
import { HELP_CENTER_LABELING } from '@trezor/urls';

import { selectIsLegacyLabelingVisible } from 'src/actions/labels/selectIsLegacyLabelingVisible';
import { useSelector } from 'src/hooks/suite';
import { type AppState } from 'src/reducers/store';

import { TurnOnSuiteSyncModals } from '../../../../labeling/TurnOnSuiteSync/TurnOnSuiteSyncModals';

export const selectShouldDisplayLegacyLabelingSuiteSyncBanner = (state: AppState) =>
    selectIsSuiteSyncFeatureAvailable(state) && selectIsLegacyLabelingVisible(state);

const variants: Variants = {
    initial: { y: 32, opacity: 0 },
    exit: { y: 32, opacity: 0 },
    drop: {
        y: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            mass: 1,
            stiffness: 266.7,
            damping: 10,
        },
    },
};

export const LegacyLabelingNotificationBanner = () => {
    const [isTurnOnSuiteSyncModalVisible, setIsTurnOnSuiteSyncModalVisible] = useState(false);

    const deviceStaticSessionId = useSelector(selectDeviceStaticSessionId);
    const shouldDisplayBanner = useSelector(selectShouldDisplayLegacyLabelingSuiteSyncBanner);

    if (!shouldDisplayBanner) {
        return null;
    }

    const handleTurnOn = () => setIsTurnOnSuiteSyncModalVisible(true);

    return (
        <ElevationContext baseElevation={0}>
            {isTurnOnSuiteSyncModalVisible && (
                <TurnOnSuiteSyncModals
                    deviceStaticSessionId={deviceStaticSessionId}
                    onClose={() => setIsTurnOnSuiteSyncModalVisible(false)}
                    onSuccess={() => setIsTurnOnSuiteSyncModalVisible(false)}
                />
            )}

            <motion.div variants={variants} initial="initial" exit="exit" animate="drop">
                <Card
                    data-testid="@notification/legacy-labeling-upgrade"
                    margin={12}
                    paddingType="small"
                    width="auto"
                >
                    <Column gap={12} alignItems="start">
                        <Row>
                            <Icon name="arrowsCounterClockwise" size={16} />
                        </Row>

                        <Column gap={4} alignItems="start">
                            <Text typographyStyle="headline-sm">
                                <Translation id="TR_TURN_ON_SECURE_SYNC_LABELS_MODAL_HEADING" />
                            </Text>

                            <Text intent="neutral" priority="secondary">
                                <Translation id="TR_LEGACY_LABELING_TURN_ON_SUITE_SYNC_BANNER_DESCRIPTION" />
                            </Text>
                        </Column>

                        <TextButton href={HELP_CENTER_LABELING} size="small" isUnderlined>
                            <Translation id="TR_LEARN_MORE" />
                        </TextButton>

                        <Button
                            onClick={handleTurnOn}
                            data-testid="@notification/legacy-labeling-upgrade/button"
                        >
                            <Translation id="TR_TURN_ON_SECURE_SYNC" />
                        </Button>
                    </Column>
                </Card>
            </motion.div>
        </ElevationContext>
    );
};
