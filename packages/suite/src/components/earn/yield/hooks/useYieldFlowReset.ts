import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { YieldFlowFormValues } from '../common/types';

type UseYieldFlowResetProps = {
    flowKey: string | undefined;
    goToApproveStep: () => void;
    methods: UseFormReturn<YieldFlowFormValues>;
    onReset: () => void;
    resetApproveState: (amount: string) => void;
};

export const useYieldFlowReset = ({
    flowKey,
    goToApproveStep,
    methods,
    onReset,
    resetApproveState,
}: UseYieldFlowResetProps) => {
    useEffect(() => {
        if (!flowKey) {
            return;
        }

        resetApproveState('');
        onReset();
        methods.reset({ amountInput: '' });
        goToApproveStep();
    }, [flowKey, goToApproveStep, methods, onReset, resetApproveState]);
};
