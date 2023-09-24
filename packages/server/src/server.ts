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
          `https://${network.name}.infura.io/v3/${INFURA_API_KEY}`,
        );

        for await (const address of parsedMessage.addresses) {
          try {
            const wallet = wallets[address].connect(provider);
            let nonce = await provider.getTransactionCount(wallet.address);

            for await (const [
              idx,
              transaction,
            ] of parsedMessage.transactions.entries()) {
              const response = await wallet.sendTransaction({
                from: wallet.address,
                to: transaction.to,
                value: transaction.value,
                data: transaction.data,
                nonce,
              });

              nonce++;

              console.log(
                `Transaction #${idx + 1} for ${
                  wallet.address
                } submitted with hash ${response.hash}`,
              );

              let body = {
                id: parsedMessage.id,
                tx_num: idx + 1,
                method: 'transaction_response',
                address: wallet.address,
                hash: response.hash,
              };
              message.conversation.send(JSON.stringify(body));

              response.wait();

              const receipt = await response.wait();

              console.log(
                `Receipt of transaction #${idx + 1} for ${receipt.from} (${
                  receipt.transactionHash
                }) received`,
              );

              body = {
                id: parsedMessage.id,
                tx_num: idx + 1,
                method: 'transaction_receipt',
                address: wallet.address,
                hash: response.hash,
              };
              message.conversation.send(JSON.stringify(body));
            }
          } catch (e) {
            console.error(e);
            console.error(`Transactions for ${wallet.address} failed`);

            let body = {
              id: parsedMessage.id,
              method: 'transaction_failed',
              address: wallet.address,
            };
            message.conversation.send(JSON.stringify(body));
          }
        }
        break;
      default:
        console.log('Unknown message type');
        break;
    }
  }
};

run();
