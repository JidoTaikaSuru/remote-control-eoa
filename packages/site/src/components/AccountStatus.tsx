import { Conversation } from '@xmtp/react-sdk';
import { useEffect, useState } from 'react';

export default function AccountStatus({
  address,
  conversation,
}: {
  address: string;
  conversation?: Conversation;
}) {
  const [txNum, setTxNum] = useState<number>();
  const [txHash, setTxHash] = useState<string>();
  const [status, setStatus] = useState<
    'idle' | 'submitted' | 'accepted' | 'failed'
  >('idle');

  useEffect(() => {
    if (!conversation) return;

    const handleMessages = async () => {
      for await (const message of await conversation.streamMessages()) {
        const parsed = JSON.parse(message.content);

        if (parsed.address !== address) continue;

        switch (parsed.method) {
          case 'transaction_response':
            setTxNum(parsed.tx_num);
            setTxHash(parsed.hash);
            setStatus('submitted');
            break;
          case 'transaction_receipt':
            setTxNum(parsed.tx_num);
            setTxHash(parsed.hash);
            setStatus('accepted');
            break;
          case 'transaction_failed':
            setStatus('failed');
            break;
          default:
            console.error('unknown method');
            break;
        }
      }
    };

    handleMessages();
  });

  return (
    <div>
      <p>Address: {address}</p>
      {status === 'submitted' && (
        <p>
          Transaction #{txNum} submitted, with hash {txHash}
        </p>
      )}
      {status === 'accepted' && (
        <p>
          Transaction #{txNum} accepted, with hash {txHash}
        </p>
      )}
      {status === 'failed' && <p>Transaction failed for {address} failed</p>}
    </div>
  );
}
