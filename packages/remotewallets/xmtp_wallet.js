import * as ethers  from  "ethers";
//import * as TX from "ethereumjs-tx";
import * as xmtp  from "@xmtp/xmtp-js";
import * as fs from 'fs'


//CONFIG
const XMTP_LISTENER_PRIVATEKEY=process.env.XMTP_LISTENER_PRIVATEKEY ||  config.XMTP_LISTENER_PRIVATEKEY;const XMTP_LISTENER_PUB="0xf8d34981a0258898893f516e7BB094b8433A9680";

//const XMTP_ACCOUNT_MANAGER_PUB="0xA00c50A0A97D7b4d03e7Ff4A8C1badf61d72816f"; //RWO doxed wallet 
const XMTP_ACCOUNT_MANAGER_PUB="0xbE098Fb26d36dA25c960413683b210e887f80853"; //random other wallet 


const PATH_PORTFOLIO_PRIVATEKEYS="portfolio_privatkeys.txt";
//const PATH_ACCOUNT_MANAGER_PUBKEYS="accountmanagers.txt";


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




const delay = ms => new Promise(resolve => setTimeout(resolve, ms))


function prep_tx(tx){
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
  /*
  if(tx.chain_id){
    delete tx.chain_id;
  }
  */
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

       /*
       {
            "from": "0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8",
            "to": "0xac03bb73b6a9e108530aff4df5077c2b3d481e5a",
            "gasLimit": "21000",
            "maxFeePerGas": "300",
            "maxPriorityFeePerGas": "10",
            "nonce": "0",
            "value": "10000000000"
            }
       */
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
}

const std_error_js = {
    method:"reply",
    status:"error",
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
          const clean_tx = prep_tx(tx_js);
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


