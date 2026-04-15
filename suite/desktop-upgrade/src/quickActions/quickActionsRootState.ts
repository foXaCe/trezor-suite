import { type DeviceRootState } from '@suite-common/device';
import { type DiscoveryRootState } from '@suite-common/wallet-core';

import { type DesktopUpdateRootState } from '../desktopUpdateReducer';

export type DesktopUpgradeQuickActionsRootState = DesktopUpdateRootState &
    DeviceRootState &
    DiscoveryRootState;
