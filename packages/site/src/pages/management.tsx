import { useContext } from 'react';
import {
  useClient,
  useConversations,
  useStartConversation,
  useCanMessage,
} from '@xmtp/react-sdk';
import { MetaMaskContext } from '../hooks';
import { isLocalSnap } from '../utils';
import { defaultSnapOrigin } from '../config';

export default function Management() {
  const { client, initialize } = useClient();
  const { conversations } = useConversations();
  const { startConversation } = useStartConversation();
  const { canMessage } = useCanMessage();

  const [state, dispatch] = useContext(MetaMaskContext);

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? state.isFlask
    : state.snapsDetected;

  return (
    <div>
      <p>Hello, management!</p>
      <p>{isMetaMaskReady ? 'Hello Snap' : 'Boo this man!'}</p>
    </div>
  );
}
