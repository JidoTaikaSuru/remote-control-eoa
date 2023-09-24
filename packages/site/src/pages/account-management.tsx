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
    if (!window.ethereum.selectedAddress) {
      console.error('An address must be selected');
      return;
    }

    const data = (await getSnapStoredData()) as Record<string, any> | null;

    if (!data) {
      console.error('There must be a transaction history to replay');
      return;
    }

    const transactionHistory =
      data.transactions[window.ethereum.selectedAddress];
    console.log(
      '🚀 ~ file: account-management.tsx:77 ~ handleReplayTransactionsClick ~ transactionHistory:',
      transactionHistory,
    );
  };

  useEffect(() => {
    if (!client) return;

    startConversationWithRemoteWalletsServer(client);
  }, [client]);

  return (
    <div>
      <p>Hello, management!</p>
      <p>{isMetaMaskReady ? 'Hello Snap' : 'Snap is not available'}</p>
      <p>
        {canMessageServer
          ? 'Can communicate with remote wallets server'
          : 'Can communicate with remote wallets server'}
      </p>
      {portfolioAddresses && (
        <>
          {portfolioAddresses.map((addr, idx) => (
            <p key={addr}>
              Address #{idx + 1}: {addr}
            </p>
          ))}
          <button onClick={handleReplayTransactionsClick}>
            Replay transactions
          </button>
        </>
      )}
    </div>
  );
}
