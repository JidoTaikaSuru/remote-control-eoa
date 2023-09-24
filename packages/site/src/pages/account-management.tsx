import { useContext, useEffect, useRef, useState } from 'react';
import {
  useClient,
  useStartConversation,
  Client,
  Conversation,
} from '@xmtp/react-sdk';
import { MetaMaskContext } from '../hooks';
import { getSnapStoredData, isLocalSnap } from '../utils';
import { defaultSnapOrigin } from '../config';
import { Wallet } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import AccountStatus from '../components/AccountStatus';
import { format } from 'date-fns';
import { MetamaskActions } from '../hooks';
import { sendClearHistory } from '../utils';

const XMTP_ACCOUNT_MANAGER_SIGNER = new Wallet(
  process.env.GATSBY_XMTP_ACCOUNT_MANAGER_PRIVATEKEY || '',
);

const XMTP_LISTENER_ADDRESS = process.env.GATSBY_XMTP_LISTENER_PUB || '';

export default function AccountManagement() {
  const [state, dispatch] = useContext(MetaMaskContext);

  const { client, initialize } = useClient();
  const { startConversation } = useStartConversation();

  const [canMessageServer, setCanMessageServer] = useState<boolean>(false);
  const [conversationWithServer, setConversationWithServer] =
    useState<Conversation>();

  const [portfolioAddresses, setPortfolioAddresses] = useState<string[]>();

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? state.isFlask
    : state.snapsDetected;

  useEffect(() => {
    if (!initialize) return;

    initialize({ signer: XMTP_ACCOUNT_MANAGER_SIGNER });
  }, [initialize]);

  const startConversationWithRemoteWalletsServer = async (client: Client) => {
    const canMessageServer = await client.canMessage(XMTP_LISTENER_ADDRESS);

    setCanMessageServer(canMessageServer);

    if (!canMessageServer) return;

    const listWalletsMsgId = uuidv4();

    const { conversation } = await startConversation(
      XMTP_LISTENER_ADDRESS,
      JSON.stringify({ id: listWalletsMsgId, method: 'list_wallets' }),
    );

    setConversationWithServer(conversation);

    if (!conversation) return;

    for await (const message of await conversation.streamMessages()) {
      // ignore messages sent from this address
      if (message.senderAddress === client.address) continue;

      console.log(`[${message.senderAddress}]: ${message.content}`);

      const parsed = JSON.parse(message.content);

      if (parsed.id === listWalletsMsgId) {
        setPortfolioAddresses(parsed.addresses);
      }
    }
  };

  const handleReplayTransactionsClick = async () => {
    if (!conversationWithServer) {
      console.error('The client is not in a conversation with the server');
      return;
    }

    if (!window.ethereum.selectedAddress) {
      console.error('An address must be selected');
      return;
    }

    const data = (await getSnapStoredData()) as Record<string, any> | null;

    if (!data) {
      console.error('There must be a transaction history to replay');
      return;
    }

    // VERY hacky temp fix because for some reason Polygon Mumbai gets recorded
    // as eip155:13881 inside the snap but is 80001 from
    // `window.ethereum.networkVersion
    let chainId = `eip155:${window.ethereum.networkVersion}`;
    if (chainId.endsWith('80001')) chainId = 'eip155:13881';

    const transactionHistory = data.transactions[
      window.ethereum.selectedAddress
    ][chainId] as Record<string, any>;

    const transactionsSortedByNonce = Object.entries(transactionHistory)
      .map(([nonce, transaction]) => ({
        nonce: parseInt(nonce),
        ...transaction,
        chainId,
      }))
      .sort((a, b) => (a.nonce < b.nonce ? -1 : 1));

    const payload = {
      id: uuidv4(),
      method: 'replay_transactions',
      addresses: portfolioAddresses,
      transactions: transactionsSortedByNonce,
    };

    conversationWithServer.send(JSON.stringify(payload));
  };

  const handleDownloadSnapStoredData = async () => {
    try {
      const data = await getSnapStoredData();
      const blob = new Blob([JSON.stringify(data)]);
      const url = window.URL.createObjectURL(blob);

      const now = new Date();
      const filename = `transactions-${format(now, 'yyyyMMddHHmmss')}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleClearHistoryClick = async () => {
    try {
      await sendClearHistory();
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  useEffect(() => {
    if (!client) return;

    startConversationWithRemoteWalletsServer(client);
  }, [client]);

  return (
    <div>
      <p>Semi-automatic Account Management</p>
      <p>{isMetaMaskReady ? 'Snap is available' : 'Snap is not available'}</p>
      <p>
        {canMessageServer
          ? 'Can communicate with remote wallets server'
          : 'Can communicate with remote wallets server'}
      </p>
      {portfolioAddresses && (
        <>
          {portfolioAddresses.map((addr) => (
            <AccountStatus
              key={addr}
              address={addr}
              conversation={conversationWithServer}
            />
          ))}
          <button onClick={handleReplayTransactionsClick}>
            Replay transactions
          </button>
          <button onClick={handleDownloadSnapStoredData}>
            Download transaction history
          </button>
          <button onClick={handleClearHistoryClick}>
            Clear transaction history
          </button>
        </>
      )}
    </div>
  );
}
