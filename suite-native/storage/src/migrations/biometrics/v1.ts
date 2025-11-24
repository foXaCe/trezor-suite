import { PersistedState } from 'redux-persist';

import { unecryptedJotaiStorage } from '../../atomWithUnecryptedStorage';
import { isPersistedState } from '../../migrationTypes';

type BiometricsPersistedState = PersistedState & {
    isBiometricsEnabled?: boolean;
};

const parseStoredBoolean = (value: string | undefined | null): boolean | undefined => {
    if (!value) return undefined;

    try {
        const parsedValue = JSON.parse(value);

        return typeof parsedValue === 'boolean' ? parsedValue : undefined;
    } catch {
        return undefined;
    }
};

const BIOMETRICS_PERSISTED_ATOM_STORAGE_KEY = 'isBiometricsOptionEnabled';

export const migrateBiometricsAtomToRedux = (oldState: unknown) => {
    if (!oldState || !isPersistedState(oldState)) {
        return oldState as BiometricsPersistedState;
    }

    const persistedState = oldState as BiometricsPersistedState;

    const storedValue = parseStoredBoolean(
        unecryptedJotaiStorage.getString(BIOMETRICS_PERSISTED_ATOM_STORAGE_KEY),
    );

    if (typeof storedValue !== 'boolean') {
        return persistedState;
    }

    unecryptedJotaiStorage.remove(BIOMETRICS_PERSISTED_ATOM_STORAGE_KEY);

    return {
        ...persistedState,
        isBiometricsEnabled: storedValue,
    };
};
