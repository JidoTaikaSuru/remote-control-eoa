import { useCallback } from 'react';
import { useClient } from '@xmtp/react-sdk';
import type { Signer } from '@xmtp/react-sdk';

export default function CreateXMTPClient({ signer }: { signer: Signer }) {
  const { client, error, isLoading, initialize } = useClient();

  const handleConnect = useCallback(async () => {
    await initialize({ signer });
  }, [initialize]);

  if (error) {
    <span>An error while initializing the XMTP client</span>;
  }

  if (isLoading) {
    <span>XMTP client is awaiting signatures...</span>;
  }

  return (
    <>
      {Boolean(client) ? (
        <span>Connected to XMTP</span>
      ) : (
        <button onClick={handleConnect}>Connecto XMTP</button>
      )}
    </>
  );
}
