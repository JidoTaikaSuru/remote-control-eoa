import * as ethers  from  "ethers";
import * as xmtp  from "@xmtp/xmtp-js";
import * as config from "./config.js";
import * as findRpcUtil from "./findRpcUtil.js";
import * as readline from 'node:readline/promises';
import * as chainlist from 'eth-chainlist';  //or https://www.npmjs.com/package/evm-chains //import * as evnChains from 'evm-chains';
import { stdin as input, stdout as output } from 'node:process';
import { delay as delay, getKnownRPC } from "./utils.js";




const rl = readline.createInterface({ input, output });
console.log("The projects goal is to enable flexible and gas efficient remote controling of EOA wallets")
console.log("The account manager does not know the private keys of the wallets but the server knows he is authorized to manage them.\n")
//await rl.question('Enter for Next...');

console.log("Account manager="+config.XMTP_ACCOUNT_MANAGER_PUB);
console.log("Remote Wallet server listening on="+config.XMTP_LISTENER_PUB);
console.log("Wallet under managment (one of many)="+config.EXAMPLE_WALLET_UNDER_REMOTE_MANAGMENT);
//await rl.question('Enter for Next...');


const x_accountmanager = new ethers.Wallet(config.XMTP_ACCOUNT_MANAGER_PRIVATEKEY )
const x_client = await xmtp.Client.create(x_accountmanager, { env: "dev" });
let can_message_remote_wallet_server= await x_client.canMessage(config.XMTP_LISTENER_PUB);
const conversation = await x_client.conversations.newConversation(config.XMTP_LISTENER_PUB);

console.log("");
console.log("");


const transfer_eth_tx_1=`{
"method":"sign_eth",
"body": {
    "from":"0xBDF05016BccbBCEC7c93e5208001a8D02eb1981d",
    "to":"0x602179f3f1dAE93Ee1A80D898552b823E1E11beE",
    "value":"100000000000000",
    "gasLimit":"0xa2f3",
    "maxFeePerGas":"0xb7263fdc",
    "max_priority_fee_per_gas":"0x59682f00",
    "chainId":"11155111"
    }
}`
const transfer_eth_tx_1_js=JSON.parse(transfer_eth_tx_1).body;

console.log("Let the remote wallet transfer some eth");
console.log(transfer_eth_tx_1);

await conversation.send(transfer_eth_tx_1);

const timestamp_1= new Date();

await delay(2000);

console.log("loading new messages...")
const messages = await conversation.messages({startTime:timestamp_1});
let related_response = JSON.parse(messages.filter(m=>{ try { let mjs=JSON.parse(m.content); return mjs.method==="reply_sign" }catch{ return false} } ).slice(-1)[0].content);
//let related_response1_js=JSON.parse(related_response.content);
let singedTx_1 = related_response.signed;
console.log("\n Server replies with signed transcation= "+singedTx_1);

console.log("\n\nLets send that to the blockchain from our account manager local machine \n");

let provider= await getKnownRPC(Number(transfer_eth_tx_1_js.chainId));

const res_tx1_to_blockchain=  await provider.sendTransaction(singedTx_1)

console.log("https://sepolia.etherscan.io/tx/"+res_tx1_to_blockchain.hash);

console.log("\n We can also ask the server to directly send the transaction to the blockchain");
const transfer_eth_tx_2=`{
    "method":"sign_and_send_eth",
    "body": {
        "from":"0xBDF05016BccbBCEC7c93e5208001a8D02eb1981d",
        "to":"0x602179f3f1dAE93Ee1A80D898552b823E1E11beE",
        "value":"200000000000000",
        "gasLimit":"0xa2f3",
        "maxFeePerGas":"0xb7263fdc",
        "max_priority_fee_per_gas":"0x59682f00",
        "chainId":"11155111"
        }
    }`
    console.log(transfer_eth_tx_2);


await conversation.send(transfer_eth_tx_2);
const timestamp_2= new Date();
await delay(3000);
console.log("loading new messages...")
const messages2 = await conversation.messages({startTime:timestamp_2});
    
let related_response2 = JSON.parse(messages2.filter(m=>{ try { let mjs=JSON.parse(m.content); return ( mjs.hasOwnProperty('tx_hash_onchain' ))  }catch{ return false} } ).slice(-1)[0].content);

console.log("Server replied with:"+related_response2);
console.log("https://sepolia.etherscan.io/tx/"+related_response2.
tx_hash_onchain);



let wrap_eth_tx=`{
    "method":"sign_and_send_eth",
    "body": {
        "from":"0xBDF05016BccbBCEC7c93e5208001a8D02eb1981d",
        "to":"0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
        "value":"200000000000000",
        "data":"0xd0e30db0",
        "gasLimit":"0xa2f3",
        "maxFeePerGas":"0xb7263fdc",
        "max_priority_fee_per_gas":"0x59682f00",
        "chainId":"eip155:11155111"
      }
    }`
 

console.log("Contracts of course also work:\n"+wrap_eth_tx);

let next_timestamp;
let next_messages;
let next_resp;
await conversation.send(wrap_eth_tx);
next_timestamp= new Date();
await delay(3000);
next_messages = await conversation.messages({startTime:next_timestamp});
next_resp = JSON.parse(next_messages.filter(m=>{ try { let mjs=JSON.parse(m.content); return ( mjs.hasOwnProperty('tx_hash_onchain' ))  }catch{ return false} } ).slice(-1)[0].content);
console.log("https://sepolia.etherscan.io/tx/"+next_resp.
tx_hash_onchain);


//Show admin commands in chat;