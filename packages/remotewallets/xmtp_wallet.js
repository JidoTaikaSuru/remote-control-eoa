import * as ethers  from  "ethers";
//import * as TX from "ethereumjs-tx";
import * as xmtp  from "@xmtp/xmtp-js";
import * as fs from 'fs';
import * as os from 'os';
import * as config from './config.js';

/*   



//Next TODO   build out   provider methods, provider options changing, option to include provider on every message. 

-- To define which wallet should sign something we should be able to just take the from:  address in the transaction. 
-- Design,  single thread while loop listening to new messages .
-- (On startup should check if in recent history there where some transactions that didn't get signed and then sign them) <- na who cares 
The signed transaction should be sent back as a reply or a JSON object that contains the original request metadata with message ID etc. 
-- Let a user login to the conversation to watch interactions. Via convers app 
-- In the loop that reads messages we can also watch for messages to control the system. Like adding new account managers.  Or allowing 
    ++ Alt option would be to put the control in another channel.  But then we gotta have multi threading....  and multi account config.. ( what happens if the process gets blocked by something... well it can't get blocked. Settings chagnes must happen immediatly can't require multiple steps. )

? Does this history of messages actually matter ?  No not really the operator can check if it went threw and manually have retry code on the outside. 
-- What if we want to drop out xmtp and go http only again  <- this could be done pretty easily by having an http request to local host messaging an http server that does everything OOOOOR even better would be the abstract all the work into a class with functions like New message arrived, And history of messages that can be loaded in on startup. 
-- What if we want to drop out xmtp and go matrix as the communication layer   <- don't worry about this will make code harder to read. 


*/ 



//import Web3 from 'web3';
//const web3 = new Web3(/* PROVIDER*/);  // downside vs ethers b/c we need to specify a provider before signing ...
// getting stupid frustrated with this feeling like i should just host the key store locally and interface with it over http and in that case we could use web3.py to make it the same object entirely  
  //TODO try it out see if we can just put null in web3 provider and sign things 



/*
 // TODO   change to wallet.fromEncryptedJson (  
*/


//CONFIG
const XMTP_LISTENER_PRIVATEKEY=process.env.XMTP_LISTENER_PRIVATEKEY ||  config.XMTP_LISTENER_PRIVATEKEY;
if(XMTP_LISTENER_PRIVATEKEY.length<10){
  console.log("Faital error,  XMTP_LISTENER_PRIVATEKEY not set.  Can be set as env variable via export in cmd or set in config.js ")
  process.exit();

}
const XMTP_LISTENER_PUB="0xf8d34981a0258898893f516e7BB094b8433A9680";

//const XMTP_ACCOUNT_MANAGER_PUB="0xA00c50A0A97D7b4d03e7Ff4A8C1badf61d72816f"; //RWO doxed wallet 
const XMTP_ACCOUNT_MANAGER_PUB="0xbE098Fb26d36dA25c960413683b210e887f80853"; //random other wallet 


const PATH_PORTFOLIO_PRIVATEKEYS="portfolio_privatkeys.txt";
//const PATH_ACCOUNT_MANAGER_PUBKEYS="accountmanagers.txt";

const LOCALUSERNAME=os.userInfo().username

//const LIST_ALLOWED_CHAINS=[  'eth', 'sepolia', 'arbitrum-nova', 'polygon' ] // maybe redundant with the rpcURLS list 
/*  
const RPC_URLS  = { // maybe don't even need this b/c all we do is sign here 
    'eth': 'https://eth-mainnet.g.alchemy.com/v2/ac6tkabLEdTV4E7M17AbEzWSQuq7SWRa',
    'sepolia': 'https://sepolia.infura.io/v3/febe4f1122fd42b3ad2f55b0264ce3bf',
    'arbitrum-nova': 'https://nova.arbitrum.io/rpc',
    'polygon': `https://polygon-mainnet.g.alchemy.com/v2/ac6tkabLEdTV4E7M17AbEzWSQuq7SWRa`,
}
*/ 
//end Config



const portfolioPrivateKeys = fs.readFileSync(PATH_PORTFOLIO_PRIVATEKEYS, 'utf-8').split('\n').map(x=>x.trim()).filter(x=>x!=='');
//const accountmanagers = fs.readFileSync(PATH_ACCOUNT_MANAGER_PUBKEYS, 'utf-8').split('\n').map(x=>x.trim()).filter(x=>x!=='');
const portfolioWallets = portfolioPrivateKeys.map( key=> new ethers.Wallet(key ) )

const portfolioWallets_dict = {};
portfolioWallets.forEach(w => {
    portfolioWallets_dict[w.address]=w;
});   


//first wallet pubkey =  0xbE098Fb26d36dA25c960413683b210e887f80853  // 
const first_portfolioWallets=portfolioWallets[0];




//TODO make this an input from the user, or have a big library preconfigured 
const provider = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/febe4f1122fd42b3ad2f55b0264ce3bf")


const delay = ms => new Promise(resolve => setTimeout(resolve, ms))


async function prep_tx(tx){
  if(tx.gas){
    tx.gasLimit = tx.gas;
    delete tx.gas;
  }
  if(tx.max_fee_per_gas){
    tx.maxFeePerGas = tx.max_fee_per_gas;
    delete tx.max_fee_per_gas;
  }
  if( tx.max_priority_fee_per_gas){
    tx.maxPriorityFeePerGas=tx.max_priority_fee_per_gas;
    delete tx.max_priority_fee_per_gas;
  }
  
  if(tx.chain_id){
    tx.chainId=tx.chain_id;
    delete tx.chain_id;
  }
  if(tx.hasOwnProperty('chainId') && tx.chainId.includes("eip155:"))
    tx.chainId=tx.chainId.replace("eip155:","")
  if( !tx.hasOwnProperty('nonce') ){
    tx.nonce=   await provider.getTransactionCount(tx.from, "pending")
  }
  tx.type=2;
  return(tx)
}






const x_listenerWallet = new ethers.Wallet(XMTP_LISTENER_PRIVATEKEY )
const x_client = await xmtp.Client.create(x_listenerWallet, { env: "dev" });

let manager_on_xmtp= await x_client.canMessage(XMTP_ACCOUNT_MANAGER_PUB);



function check_transaction_schema (tx){ //assumes js object
    try {
       //const jstx=  typeof tx === string ? JSON.parse(tx) : tx ;
       const keyset=new Set(Object.keys(tx));
       if(keyset.has("from")&&keyset.has("to")&&keyset.has("gasLimit")&&keyset.has("value") ){  //removed keyset.has("max_fee_per_gas")&&keyset.has("maxPriorityFeePerGas") and onoce 
        return true;
       }
       else 
        return false;

      } catch (error) {
        console.log(error)
        return false; 
      }
      
}

 

let last_id_i_sent='';
async function xSendUtil(convo,message){
    let res = await convo.send(message);
    last_id_i_sent=res.id;
}


/*
{
  "from":"0xbE098Fb26d36dA25c960413683b210e887f80853",
  "to":"0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
  "value":"0x2386f26fc10000",
  "data":"0xd0e30db0",
  "gas":"0xa2f3",
  "max_fee_per_gas":"0xb7263fdc",
  "max_priority_fee_per_gas":"0x59682f00",
  "chain_id":"eip155:11155111",
  "origin":"https://sepolia.etherscan.io"
}

*/

 1===1; 

const method_options = [ "sign_eth","api","killall", "list_wallets"];

const std_out_js = {
method:"default",
status:"success",
nodeuser:LOCALUSERNAME,
}

const std_error_js = {
    method:"reply",
    status:"error",
    nodeuser:LOCALUSERNAME,
    }

const std_replies ={
    error:"error",
    bad_json:"bad_json"
}


while(true){

  try { 
 console.log(`Starting to listen`);
 const conversation = await x_client.conversations.newConversation(XMTP_ACCOUNT_MANAGER_PUB);
 console.log("Conversation created", conversation);
 await xSendUtil(conversation,"hello world");


for await (const message of await conversation.streamMessages()) {
  
  try { 


    if(message.id===last_id_i_sent){
        console.log("skip message");
        continue;
    }
    if(   Object.values(std_replies).includes(message.content) ){ //maybe redundant with the above;
        console.log("skip message");
        continue;
    }
  
    console.log(`[${message.senderAddress}]: ${message.content}`);
    let msg_js =  JSON.parse(message.content.replace(/(\r\n|\n|\r)/gm, ""))
    if( ( message.senderAddress===XMTP_ACCOUNT_MANAGER_PUB ||   message.senderAddress===XMTP_LISTENER_PUB ) && msg_js.method){


      

      switch (msg_js.method) {
        case 'sign_eth':
          let tx_js = msg_js.body  
          const clean_tx = await prep_tx(tx_js);
          if(check_transaction_schema(clean_tx)){
              if( portfolioWallets_dict[msg_js.body.from]){
              const signedTX= await portfolioWallets_dict[msg_js.body.from].signTransaction(clean_tx);
              //const signedTX= await first_portfolioWallets.signTransaction(clean_tx);

              let reply = std_out_js;
              reply.method="reply_"+msg_js.method;
              reply.signed=signedTX;
              await xSendUtil(conversation,JSON.stringify(reply));
              }
              else {
                const erstr2=msg_js.body.from+"wallet not under managment";
                console.log(erstr2);
                await xSendUtil(conversation,erstr2);
                continue;
              }
          }
          else{
            await xSendUtil(conversation,"Not Transaction Format");
          }
          break;


        case 'killall':
            if(  message.senderAddress===XMTP_LISTENER_PUB   ){
                await xSendUtil(conversation,"Goodbye");
                process.exit();
            }
          break;

        case 'list_wallets':
            const allkeysstr=Object.keys(portfolioWallets_dict).join(`
            `);
             await xSendUtil(conversation, allkeysstr );
            
            
        break;
        default:
          console.log(`Method not found`);
      }


  
          
      }

    } catch (error) {
      console.log(error);
      await xSendUtil(conversation,std_replies.error);
      1==1;
    } finally {
      console.log("next message");
      await delay(1000);
    }

  }
}
catch(conversation_error){
  console.log("conversation_error, will try to restart");
  console.log(conversation_error);
  //console.log(JSON.stringify(conversation_error));
}
finally{
  await delay(1000);
}



}


