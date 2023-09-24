import { useContext, useEffect } from 'react';
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

const XMTP_ACCOUNT_MANAGER_PRIVATEKEY =
  '0xd68f09af7c08401aba79ace4012de6f70aa7056bb8d6243ee4213f1522be4b45';
// const XMTP_ACCOUNT_MANAGER_PUB = '0xbE098Fb26d36dA25c960413683b210e887f80853';
const XMTP_ACCOUNT_MANAGER_SIGNER = new Wallet(XMTP_ACCOUNT_MANAGER_PRIVATEKEY);

export default function AccountManagement() {
  const [state, dispatch] = useContext(MetaMaskContext);

  const { client, initialize } = useClient();
  const { conversations } = useConversations();
  const { startConversation } = useStartConversation();
  const { canMessage } = useCanMessage();

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
      .canMessage('0x3F11b27F323b62B159D2642964fa27C46C841897')
      .then((canMessage) => console.log('Can message (#1)?', canMessage));
  }, [client]);

  useEffect(() => {
    console.log('Conversations:', conversations);
  }, [conversations]);

  useEffect(() => {
    if (!client) return;

    canMessage('0x3F11b27F323b62B159D2642964fa27C46C841897').then(
      (canMessage) => console.log('Can message (#2)?', canMessage),
    );
  }, [client, canMessage]);

  // useEffect(() => {
  //   if (!client) return;

  //   conversations;
  // }, [client, conversations]);

  return (
    <div>
      <p>Hello, management!</p>
      <p>{isMetaMaskReady ? 'Hello Snap' : 'Boo this man!'}</p>
    </div>
  );
}
