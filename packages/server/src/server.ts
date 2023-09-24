import { readFileSync } from 'node:fs';
import { Wallet, ethers } from 'ethers';
import { Client } from '@xmtp/xmtp-js';
import 'dotenv/config';

const XMTP_LISTENER_PRIVATEKEY = process.env.XMTP_LISTENER_PRIVATEKEY || '';
const INFURA_API_KEY = process.env.INFURA_API_KEY || '';

// TODO: Change to get this from environment variable
const wallet = new Wallet(XMTP_LISTENER_PRIVATEKEY);
console.log(`Wallet address: ${wallet.address}`);

const privateKeys = readFileSync('portfolio_private_keys.txt', {
  encoding: 'utf-8',
})
  .split('\n')
  .filter(Boolean);

const wallets = Object.fromEntries(
  privateKeys.map((privateKey) => {
    const wallet = new Wallet(privateKey);
    return [wallet.address, wallet];
  }),
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
      case 'replay_transactions':
        console.dir(parsedMessage);
        const chainId = parseInt(
          parsedMessage.transactions[0].chainId.replace('eip155:', ''),
        );
        const network = ethers.providers.getNetwork(chainId);
        const provider = new ethers.providers.JsonRpcProvider(
          `https://${network.name}.infura.io/v3/d7f5de59a9ec4976b1da40eeae4f1ffb`,
        );
        console.log('Provider ready for:', await provider.ready);
        break;
      default:
        console.log('Unknown message type');
        break;
    }
  }
};

run();
