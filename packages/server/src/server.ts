import { Wallet } from 'ethers';
import { Client } from '@xmtp/xmtp-js';

// TODO: Change to get this from environment variable
const wallet = new Wallet(
  '0xf0a145223a006990346920eacba3e2067581824aaeb02d2a252ac7fa594515ed',
);
console.log(`Wallet address: ${wallet.address}`);

const run = async () => {
  const xmtp = await Client.create(wallet, { env: 'dev' });

  for await (const message of await xmtp.conversations.streamAllMessages()) {
    console.log(
      `New message from ${message.senderAddress}: ${message.content}`,
    );
  }
};

run();
