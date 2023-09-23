import {
  OnRpcRequestHandler,
  OnTransactionHandler,
} from '@metamask/snaps-types';
import { heading, panel, text } from '@metamask/snaps-ui';

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  switch (request.method) {
    case 'hello':
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            text(`Hello, **${origin}**!`),
            text('This custom confirmation is just for display purposes.'),
            text(
              'But you can edit the snap source code to make it do something, if you want to!',
            ),
          ]),
        },
      });
    case 'clearHistory':
      await snap.request({
        method: 'snap_manageState',
        params: { operation: 'clear' },
      });
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'alert',
          content: panel([text('Clear transaction history')]),
        },
      });
    case 'getStoredData':
      return await snap.request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      });
    default:
      throw new Error('Method not found.');
  }
};

export const onTransaction: OnTransactionHandler = async ({
  transaction,
  chainId,
  transactionOrigin,
}) => {
  console.log('Transaction:', transaction);
  console.log('Chain id:', chainId);
  console.log('Transaction origin:', transactionOrigin);

  const accountAddress = transaction.from as string;

  const persistedData =
    (await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get' },
    })) || ({ transactions: {} } as Record<string, any>);

  console.log('Persisted data:', persistedData);

  const transactionCount = await ethereum.request({
    method: 'eth_getTransactionCount',
    params: [accountAddress, 'pending'],
  });

  console.log('Transaction count:', transactionCount);

  const transactionHistoryForAccount =
    persistedData.transactions[accountAddress] || {};
  transactionHistoryForAccount[chainId] = {
    ...transactionHistoryForAccount[chainId],
    [transactionCount as number]: {
      transactionOrigin,
      ...transaction,
    },
  };
  persistedData.transactions[accountAddress] = transactionHistoryForAccount;

  await snap.request({
    method: 'snap_manageState',
    params: { operation: 'update', newState: persistedData },
  });

  return {
    content: panel([heading('Record transactions')]),
  };
};
