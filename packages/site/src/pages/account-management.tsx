import { useContext, useEffect, useState } from 'react';
import {
  useClient,
  useConversations,
  useStartConversation,
  useCanMessage,
} from '@xmtp/react-sdk';
import { MetaMaskContext } from '../hooks';
import { isLocalSnap } from '../utils';
import { defaultSnapOrigin } from '../config';
import { Wallet } from 'ethers';

const XMTP_ACCOUNT_MANAGER_SIGNER = new Wallet(
  process.env.GATSBY_XMTP_ACCOUNT_MANAGER_PRIVATEKEY || '',
);

const XMTP_LISTENER_ADDRESS = process.env.GATSBY_XMTP_LISTENER_PUB || '';

export default function AccountManagement() {
  const [state, dispatch] = useContext(MetaMaskContext);

  const { client, initialize } = useClient();
  const { conversations } = useConversations();
  const { startConversation } = useStartConversation();

  const [canMessageServer, setCanMessageServer] = useState<boolean>(false);

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? state.isFlask
    : state.snapsDetected;

  useEffect(() => {
    if (!initialize) return;

    initialize({ signer: XMTP_ACCOUNT_MANAGER_SIGNER });
  }, [initialize]);

  useEffect(() => {
    if (!client) return;

    client
      .canMessage(XMTP_LISTENER_ADDRESS)
      .then((canMessageServer) => setCanMessageServer(canMessageServer));
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
    </div>
  );
}
