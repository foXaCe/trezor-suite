import { useState } from 'react';

import { Translation } from '@suite/intl';
import { goto, selectRouterApp } from '@suite/router';
import { notificationsActions } from '@suite-common/toast-notifications';
import {
    type Network,
    type NetworkAccount,
    type NetworkSymbol,
    getNetwork,
    networks,
} from '@suite-common/wallet-config';
import {
    accountsActions,
    changeCoinVisibility,
    selectAccounts,
    selectEnabledNetworks,
} from '@suite-common/wallet-core';
import { getAvailableAccountTypes, prepareNewAccountPayload } from '@suite-common/wallet-utils';
import { CollapsibleBox, Column, Modal, Tooltip } from '@trezor/components';
import { hasBitcoinOnlyFirmware } from '@trezor/device-utils';
import { arrayPartition } from '@trezor/utils';

import { CoinList } from 'src/components/suite/CoinList/CoinList';
import { useAvailableNetworkSymbols } from 'src/components/wallet/WalletLayout/AccountsMenu/useAvailableNetworkSymbols';
import { useNetworkSupport } from 'src/hooks/settings/useNetworkSupport';
import { useDispatch, useSelector } from 'src/hooks/suite';
import { selectIsPublic } from 'src/reducers/wallet/coinjoinReducer';
import {
    selectHasExperimentalFeature,
    selectIsDebugModeActive,
} from 'src/selectors/suite/suiteSelectors';
import { type TrezorDevice } from 'src/types/suite';
import { type Account } from 'src/types/wallet';

import { AccountTypeSelect } from './AccountTypeSelect/AccountTypeSelect';
import { AddAccountButton } from './AddAccountButton/AddAccountButton';
import { SelectNetwork } from './SelectNetwork';

type AddAccountProps = {
    device: TrezorDevice;
    onCancel: () => void;
    onConfirm?: () => void;
    symbol?: NetworkSymbol;
    noRedirect?: boolean;
    isCoinjoinDisabled?: boolean;
    isBackClickDisabled?: boolean;
    onAddAccount?: (account: Account) => void;
};

export const AddAccountModal = ({
    device,
    onCancel,
    onConfirm,
    symbol,
    noRedirect,
    onAddAccount,
    isCoinjoinDisabled,
    isBackClickDisabled,
}: AddAccountProps) => {
    const accounts = useSelector(selectAccounts);
    const app = useSelector(selectRouterApp);
    const isDebug = useSelector(selectIsDebugModeActive);
    const isCoinjoinPublic = useSelector(selectIsPublic);
    const enabledNetworkSymbols = useSelector(selectEnabledNetworks);
    const useTestnetNetworks = useSelector(selectHasExperimentalFeature('testnet-networks'));
    const dispatch = useDispatch();

    const { showUnsupportedCoins, supportedMainnets, unsupportedMainnets, supportedTestnets } =
        useNetworkSupport();

    const supportedNetworks = [...supportedMainnets, ...supportedTestnets];
    const allTestnetNetworksDisabled = !supportedTestnets.some(network =>
        enabledNetworkSymbols.includes(network.symbol),
    );
    const isBitcoinOnlyFirmware = hasBitcoinOnlyFirmware(device);

    // applied when changing account in trading exchange receive options context
    const networkPinned = !!symbol;
    const preselectedNetwork = symbol && supportedNetworks.find(n => n.symbol === symbol);
    // or in case of only btc is enabled on bitcoin-only firmware
    const bitcoinOnlyDefaultNetworkSelection =
        isBitcoinOnlyFirmware && supportedMainnets.length === 1 && allTestnetNetworksDisabled
            ? networks.btc
            : undefined;

    const [selectedNetwork, setSelectedNetwork] = useState<Network | undefined>(
        preselectedNetwork || bitcoinOnlyDefaultNetworkSelection,
    );
    const [selectedAccount, setSelectedAccount] = useState<NetworkAccount | undefined>(undefined);

    const isSelectedNetworkEnabled =
        !!selectedNetwork && enabledNetworkSymbols.includes(selectedNetwork.symbol);

    const availableNetworksSymbols = useAvailableNetworkSymbols();

    const enabledNetworks = availableNetworksSymbols.map(networkSymbol =>
        getNetwork(networkSymbol),
    );
    const disabledNetworks = supportedNetworks.filter(
        network => !availableNetworksSymbols.includes(network.symbol),
    );

    const [disabledMainnetNetworks, disabledTestnetNetworks] = arrayPartition(
        disabledNetworks,
        network => !network?.testnet,
    );

    // Collect all empty accounts related to selected device and selected accountType
    const currentType = selectedAccount?.accountType ?? 'normal';
    const scopedAccounts = selectedNetwork
        ? accounts
              .filter(
                  a =>
                      a.deviceState === device.state?.staticSessionId &&
                      a.symbol === selectedNetwork.symbol &&
                      a.accountType === currentType,
              )
              .toSorted((a, b) => a.index - b.index)
        : [];
    const emptyAccounts = selectedNetwork ? scopedAccounts.filter(a => a.empty) : [];

    const filterNetworksBySymbol = (items: Network[], networkSymbol?: NetworkSymbol) =>
        networkSymbol ? items.filter(network => network.symbol === networkSymbol) : items;

    const filteredDisabledNetworks = filterNetworksBySymbol(
        symbol ? disabledNetworks : disabledMainnetNetworks,
        symbol,
    );
    const filteredEnabledNetworks = filterNetworksBySymbol(enabledNetworks, symbol);

    const visibleNetworks =
        emptyAccounts.length > 0 ? filteredEnabledNetworks : filteredDisabledNetworks;

    const isCoinjoinVisible = (isCoinjoinPublic || isDebug) && !isCoinjoinDisabled;

    const getAccountTypesForNetwork = (network?: Network) => {
        if (!network || !enabledNetworkSymbols.includes(network.symbol)) {
            return undefined;
        }

        return getAvailableAccountTypes(network.symbol, {
            isCoinjoinVisible,
            isDebug,
        });
    };

    const accountTypes = getAccountTypesForNetwork(selectedNetwork);

    const selectedNetworks = selectedNetwork ? [selectedNetwork.symbol] : [];

    function enableNetwork(network = selectedNetwork) {
        onCancel();
        if (network) {
            dispatch(changeCoinVisibility({ symbol: network.symbol, shouldBeVisible: true }));
            onConfirm?.();

            if (app === 'wallet' && !noRedirect) {
                // redirect to account only if added from "wallet" app
                dispatch(
                    goto({
                        routeName: 'wallet-index',
                        params: {
                            symbol: network.symbol,
                            accountIndex: 0,
                            accountType: 'normal',
                        },
                    }),
                );
            }
        }
    }

    async function enableAccount(
        account: Account,
        {
            selectedAccount: nextSelectedAccount = selectedAccount,
            accountTypes: nextAccountTypes = accountTypes,
        }: {
            selectedAccount?: NetworkAccount;
            accountTypes?: NetworkAccount[];
        } = {},
    ) {
        onCancel();
        if (account.visible) {
            const newAccount = await prepareNewAccountPayload({
                accountType: account.accountType,
                networkSymbol: account.symbol,
                index: account.index + 1,
                backendType: account.backendType != 'coinjoin' ? account.backendType : undefined,
                selectedAccount: nextSelectedAccount,
                accountTypes: nextAccountTypes,
                device,
            });

            if (newAccount instanceof Error) {
                dispatch(
                    notificationsActions.addToast({
                        type: 'discovery-error',
                        error: newAccount.message,
                    }),
                );

                return;
            }

            dispatch(accountsActions.createAccount(newAccount));
        } else {
            dispatch(accountsActions.changeAccountVisibility(account));
        }

        onConfirm?.();

        onAddAccount?.(account);
        if (app === 'wallet' && !noRedirect) {
            // redirect to account only if added from "wallet" app
            dispatch(
                goto({
                    routeName: 'wallet-index',
                    params: {
                        symbol: account.symbol,
                        accountIndex: account.index,
                        accountType: account.accountType,
                    },
                }),
            );
        }
    }

    async function addNewAccount({
        network = selectedNetwork,
        account = network?.accountTypes[currentType],
        accountTypes: nextAccountTypes = accountTypes,
    }: {
        network?: Network;
        account?: NetworkAccount;
        accountTypes?: NetworkAccount[];
    } = {}) {
        if (network && account) {
            const newAccount = await prepareNewAccountPayload({
                accountType: account.accountType,
                networkSymbol: network.symbol,
                index: 0,
                backendType: account.backendType != 'coinjoin' ? account.backendType : undefined,
                selectedAccount: account,
                accountTypes: nextAccountTypes,
                device,
            });

            if (newAccount instanceof Error) {
                dispatch(
                    notificationsActions.addToast({
                        type: 'discovery-error',
                        error: newAccount.message,
                    }),
                );

                return;
            }

            onCancel();
            dispatch(accountsActions.createAccount(newAccount));
            onConfirm?.();
        }
    }

    const handleNetworkSelection = async (networkSymbol?: NetworkSymbol) => {
        if (!networkSymbol) {
            setSelectedNetwork(undefined);

            return;
        }

        const networkToSelect = networks[networkSymbol];

        if (!networkToSelect) {
            return;
        }

        const selectedNetworkAccountTypes = getAccountTypesForNetwork(networkToSelect);
        const isAccountTypeSelectionStep = !!selectedNetworkAccountTypes?.length;

        if (isAccountTypeSelectionStep && selectedNetworkAccountTypes.length > 1) {
            const alreadySelected = networkToSelect.symbol === selectedNetwork?.symbol;

            if (!networkPinned && !alreadySelected) {
                setSelectedNetwork(networkToSelect);
                setSelectedAccount(undefined);
            }

            return;
        }

        if (!enabledNetworkSymbols.includes(networkToSelect.symbol)) {
            setSelectedNetwork(networkToSelect);
            enableNetwork(networkToSelect);

            return;
        }

        const defaultAccountType = selectedNetworkAccountTypes?.[0];
        const defaultAccountTypeName = defaultAccountType?.accountType ?? 'normal';
        const nextScopedAccounts = accounts
            .filter(
                account =>
                    account.deviceState === device.state?.staticSessionId &&
                    account.symbol === networkToSelect.symbol &&
                    account.accountType === defaultAccountTypeName,
            )
            .toSorted((a, b) => a.index - b.index);
        const defaultAccount = nextScopedAccounts.at(-1);

        setSelectedNetwork(networkToSelect);
        setSelectedAccount(defaultAccountType);

        if (defaultAccount) {
            await enableAccount(defaultAccount, {
                selectedAccount: defaultAccountType,
                accountTypes: selectedNetworkAccountTypes,
            });
        } else {
            await addNewAccount({
                network: networkToSelect,
                account: defaultAccountType,
                accountTypes: selectedNetworkAccountTypes,
            });
        }
    };

    const getStepConfig = () => {
        const isAccountTypeSelectionStep =
            !!selectedNetwork && accountTypes && accountTypes.length > 1;

        const isAccountActivated =
            preselectedNetwork &&
            enabledNetworks.some(enabledNetwork => enabledNetwork.symbol === symbol);

        return isAccountTypeSelectionStep
            ? {
                  heading: (
                      <Translation
                          id="TR_ADD_NETWORK_ACCOUNT"
                          values={{
                              network: selectedNetwork.name,
                          }}
                      />
                  ),
                  description: <Translation id="TR_SELECT_TYPE" />,
                  children: (
                      <AccountTypeSelect
                          selectedAccountType={selectedAccount}
                          accountTypes={accountTypes}
                          onSelectAccountType={setSelectedAccount}
                          networkType={selectedNetwork.networkType}
                          symbol={selectedNetwork.symbol}
                      />
                  ),
                  onBackClick: !isBackClickDisabled
                      ? () => setSelectedNetwork(undefined)
                      : undefined,
              }
            : {
                  heading: <Translation id="TR_ADD_ACCOUNT" />,
                  children: (
                      <Column gap={24}>
                          {!symbol && (
                              <SelectNetwork
                                  heading={<Translation id="TR_ACTIVATED_COINS" />}
                                  networks={enabledNetworks}
                                  selectedNetworks={selectedNetworks}
                                  handleNetworkSelection={handleNetworkSelection}
                              />
                          )}
                          <SelectNetwork
                              heading={
                                  isAccountActivated ? (
                                      <Translation id="TR_ACTIVATED_COINS" />
                                  ) : (
                                      <Translation id="TR_INACTIVE_COINS" />
                                  )
                              }
                              networks={symbol ? visibleNetworks : disabledMainnetNetworks}
                              selectedNetworks={selectedNetworks}
                              handleNetworkSelection={handleNetworkSelection}
                          />
                          {!symbol && !!disabledTestnetNetworks.length && useTestnetNetworks && (
                              <CollapsibleBox
                                  heading={
                                      <Tooltip
                                          content={
                                              <Translation id="TR_TESTNET_COINS_DESCRIPTION" />
                                          }
                                          hasIcon
                                      >
                                          <Translation id="TR_TESTNET_COINS" />
                                      </Tooltip>
                                  }
                                  data-testid="@modal/account/activate_more_coins"
                              >
                                  <CoinList
                                      onClick={handleNetworkSelection}
                                      networks={disabledTestnetNetworks}
                                      enabledNetworks={selectedNetworks}
                                  />
                              </CollapsibleBox>
                          )}
                          {!symbol && showUnsupportedCoins && (
                              <CollapsibleBox
                                  heading={
                                      <Tooltip
                                          hasIcon
                                          content={
                                              <Translation id="TR_UNSUPPORTED_COINS_DESCRIPTION" />
                                          }
                                      >
                                          <Translation id="TR_UNSUPPORTED_COINS" />
                                      </Tooltip>
                                  }
                                  data-testid="@modal/account/activate_more_coins"
                              >
                                  <CoinList
                                      onClick={handleNetworkSelection}
                                      networks={unsupportedMainnets}
                                      enabledNetworks={selectedNetworks}
                                  />
                              </CollapsibleBox>
                          )}
                      </Column>
                  ),
              };
    };

    return (
        <Modal
            onCancel={onCancel}
            width={600}
            bottomContent={
                selectedNetwork &&
                (isSelectedNetworkEnabled ? (
                    <AddAccountButton
                        network={selectedNetwork}
                        selectedAccount={selectedAccount}
                        scopedAccounts={scopedAccounts}
                        onEnableAccount={enableAccount}
                        onAddNewAccount={addNewAccount}
                    />
                ) : (
                    <Modal.Button data-testid="@find-account" onClick={() => enableNetwork()}>
                        <Translation
                            id="TR_ENABLE_NETWORK_BUTTON"
                            values={{ networkName: selectedNetwork.name }}
                        />
                    </Modal.Button>
                ))
            }
            {...getStepConfig()}
        />
    );
};
