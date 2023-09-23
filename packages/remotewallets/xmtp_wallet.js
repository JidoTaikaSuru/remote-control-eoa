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

 


const portfolioPrivateKeys = fs.readFileSync(PATH_PORTFOLIO_PRIVATEKEYS, 'utf-8').split('\n').map(x=>x.trim()).filter(x=>x!=='');
 
const portfolioWallets = portfolioPrivateKeys.map( key=> new ethers.Wallet(key ) )


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
  if(tx.chain_id){
    delete tx.chain_id;
  }
  tx.type=2;
return(tx)
}






const x_listenerWallet = new ethers.Wallet(XMTP_LISTENER_PRIVATEKEY )
const x_client = await xmtp.Client.create(x_listenerWallet, { env: "dev" });

let manager_on_xmtp= await x_client.canMessage(XMTP_ACCOUNT_MANAGER_PUB);





function check_transaction_schema (tx){ //assumes js object
    try {
        const keyset=new Set(Object.keys(tx));
       if(keyset.has("from")&&keyset.has("to")&&keyset.has("gasLimit")&&keyset.has("value") ){ 
        return true;
       }
       else 
        return false;
 
      } catch (error) {
        console.log(error)
        return false; 
      }
      
}
 
 1===1; 
 
const std_out_js = {
method:"default",
status:"success",
}


while(true){

  try { 
 console.log(`Starting to listen`);
 const conversation = await x_client.conversations.newConversation(XMTP_ACCOUNT_MANAGER_PUB);
 console.log("Conversation created", conversation);
 await conversation.send("hello world");



for await (const message of await conversation.streamMessages()) {
  
  try { 

  
    console.log(`[${message.senderAddress}]: ${message.content}`);
    let msg_js =  JSON.parse(message.content.replace(/(\r\n|\n|\r)/gm, ""))
    if( ( message.senderAddress===XMTP_ACCOUNT_MANAGER_PUB ||   message.senderAddress===XMTP_LISTENER_PUB ) && msg_js.method){


      
      if(  ( msg_js.method==="sign_eth"  )   ){
          let tx_js = msg_js.body  
              const clean_tx = prep_tx(tx_js);
              if(check_transaction_schema(clean_tx)){
                  const signedTX= await first_portfolioWallets.signTransaction(clean_tx);
                  let reply = std_out_js;
                  reply.method="reply_"+msg_js.method;
                  reply.signed=signedTX;
                  await conversation.send(JSON.stringify(reply));
              }
              else{
                  await conversation.send("Not Transaction Format");
              }
          
              
        }
 
          
      }

    } catch (error) {
      console.log(error); 
    } finally {
      console.log("next message");
    }

  }
}
catch(conversation_error){
  console.log("conversation_error, will try to restart");
  console.log(conversation_error);
  console.log(JSON.stringify(conversation_error));
}
finally{ 
}



}


