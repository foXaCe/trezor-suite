import { Translation } from '@suite/intl';
import { Banner, Button, Column, Text } from '@trezor/components';

type YieldActionStepWarningProps = {
    isInsufficientFunds?: boolean;
    isApprovalInsufficient?: boolean;
    onModifyApproval?: () => void;
};

export const YieldActionStepWarning = ({
    isInsufficientFunds = false,
    isApprovalInsufficient = false,
    onModifyApproval,
}: YieldActionStepWarningProps) => {
    if (!isInsufficientFunds && !isApprovalInsufficient) {
        return null;
    }

    return (
        <Column gap={8}>
            {isInsufficientFunds && (
                <Banner
                    intent="warning"
                    description={
                        <Text>
                            <Translation id="AMOUNT_IS_NOT_ENOUGH" />
                        </Text>
                    }
                />
            )}

            {isApprovalInsufficient && (
                <Banner
                    intent="warning"
                    description={
                        <Column gap={12}>
                            <Text>
                                <Translation id="TR_EARN_YIELD_APPROVAL_TOO_LOW" />
                            </Text>
                            {onModifyApproval && (
                                <Button size="small" intent="warning" onClick={onModifyApproval}>
                                    <Translation id="TR_EARN_YIELD_MODIFY_APPROVAL" />
                                </Button>
                            )}
                        </Column>
                    }
                />
            )}
        </Column>
    );
};
