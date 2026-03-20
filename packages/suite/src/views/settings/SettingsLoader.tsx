import React from 'react';

import { Translation } from '@suite/intl';
import { Banner } from '@trezor/components';

export const SettingsLoading = () => (
    <Banner
        intent="neutral"
        isLoading
        title={<Translation id="TR_LOADING_ACCOUNTS" />}
        description={<Translation id="TR_LOADING_ACCOUNTS_DESCRIPTION" />}
    />
);
