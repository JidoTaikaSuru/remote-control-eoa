import { readFileSync } from 'node:fs';
import { Wallet } from 'ethers';
import { Client } from '@xmtp/xmtp-js';

// TODO: Change to get this from environment variable
const wallet = new Wallet(
  '0xf0a145223a006990346920eacba3e2067581824aaeb02d2a252ac7fa594515ed',
);
console.log(`Wallet address: ${wallet.address}`);

const privateKeys = readFileSync('portfolio_private_keys.txt', {
  encoding: 'utf-8',
})
  .split('\n')
  .filter(Boolean);

const wallets = Object.fromEntries(
  privateKeys
    .map((privateKey) => new Wallet(privateKey))
    .map((wallet) => [wallet.address, wallet]),
);

const run = async () => {
  const xmtp = await Client.create(wallet, { env: 'dev' });

  for await (const message of await xmtp.conversations.streamAllMessages()) {
    // ignore messages sent from this address
    if (message.senderAddress === xmtp.address) continue;

    console.log(
      `New message from ${message.senderAddress}: ${message.content}`,
    );

    const parsedMessage = JSON.parse(message.content || '{}');

    switch (parsedMessage.method) {
      case 'list_wallets':
        const body = {
          id: parsedMessage.id,
          method: parsedMessage.method,
          addresses: Object.keys(wallets),
        };
        message.conversation.send(JSON.stringify(body));
        break;

      default:
        console.log('Unknown message type');
        break;
    }
  }
};

run();
