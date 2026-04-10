/* eslint-disable no-console */

import { getAccountInfo, getAccountInfoParams } from './discovery';

const network = process.argv[2] ?? '';
const descriptor = process.argv[3] ?? '';
const params = getAccountInfoParams(network, descriptor);

(async () => {
    console.log('✅', 'Start');

    const accountInfo = await getAccountInfo(params);

    console.log('✅', 'End, printing account info:');
    console.log(JSON.stringify(accountInfo, null, 4));
})();
