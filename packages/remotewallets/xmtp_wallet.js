import * as ethers  from  "ethers";
//import * as TX from "ethereumjs-tx";
import * as xmtp  from "@xmtp/xmtp-js";
import * as fs from 'fs';
import * as os from 'os';
import * as config from './config.js';
import * as chainlist from 'eth-chainlist';  //or https://www.npmjs.com/package/evm-chains //import * as evnChains from 'evm-chains';


 
 


/*
 // TODO   change to wallet.fromEncryptedJson (  
*/


//CONFIG
const XMTP_LISTENER_PRIVATEKEY=process.env.XMTP_LISTENER_PRIVATEKEY ||  config.XMTP_LISTENER_PRIVATEKEY;
if(XMTP_LISTENER_PRIVATEKEY.length<10){
    console.log("Faital error,  XMTP_LISTENER_PRIVATEKEY not set.  Can be set as env variable via export in cmd or set in config.js ")
    process.exit();
  
  }
const XMTP_LISTENER_PUB=process.env.XMTP_LISTENER_PUB || config.XMTP_LISTENER_PUB || "0xf8d34981a0258898893f516e7BB094b8433A9680";

//const XMTP_ACCOUNT_MANAGER_PUB="0xA00c50A0A97D7b4d03e7Ff4A8C1badf61d72816f"; //RWO doxed wallet 
const XMTP_ACCOUNT_MANAGER_PUB= process.env.XMTP_ACCOUNT_MANAGER_PUB || config.XMTP_ACCOUNT_MANAGER_PUB ||"0xbE098Fb26d36dA25c960413683b210e887f80853"; //random other wallet 


const PATH_PORTFOLIO_PRIVATEKEYS="portfolio_privatkeys.txt";
//const PATH_ACCOUNT_MANAGER_PUBKEYS="accountmanagers.txt"; // for now just 1 manager 

const LOCALUSERNAME=os.userInfo().username
 


const portfolioPrivateKeys = fs.readFileSync(PATH_PORTFOLIO_PRIVATEKEYS, 'utf-8').split('\n').map(x=>x.trim()).filter(x=>x!=='');
 
const portfolioWallets = portfolioPrivateKeys.map( key=> new ethers.Wallet(key ) )

const portfolioWallets_dict = {};
portfolioWallets.forEach(w => {
    portfolioWallets_dict[w.address]=w;
});   

  

let working_rpc_providers={};

async function  checkChainList(chainId,trycount){
    const found_chainlists=chainlist.getChainById(chainId);
 
    if( found_chainlists.rpc[trycount]=== undefined ){
     throw new Error('ChainList didnt find a network for chainid '+chainId+" idx "+trycount); 
    }
    const provider = new ethers.providers.JsonRpcProvider(found_chainlists.rpc[trycount]);
    const a2 = await provider.getTransactionCount(XMTP_LISTENER_PUB, "pending")
    console.log(" testing chainlist Provider with getTransactionCount="+a2)
    return provider;

}
async function getKnownRPC(chainId){
    chainId=Number(chainId);
    let outProvider ;
    if(working_rpc_providers.hasOwnProperty(chainId) ){
        return working_rpc_providers[chainId];
    }
    try{
       
        if( config.CHAIN_ID_TO_RPC_URL.hasOwnProperty(chainId)){
            outProvider= new ethers.providers.JsonRpcProvider(config.CHAIN_ID_TO_RPC_URL[chainId])
            const a2 = await outProvider.getTransactionCount(XMTP_LISTENER_PUB, "pending")
            console.log(" testing Configured Provider with getTransactionCount="+a2)
        }
        else if(config.INFURA_API_KEY && config.INFURA_API_KEY.length>10 ){
            outProvider= new ethers.providers.InfuraProvider(chainId,config.INFURA_API_KEY);
            const a2 = await outProvider.getTransactionCount(XMTP_LISTENER_PUB, "pending")
            console.log(" testing Infura Provider with getTransactionCount="+a2)
        }
        else if ( config.ALCHEMY_API_KEY &&  config.ALCHEMY_API_KEY.length>10){
            outProvider= new ethers.providers.AlchemyProvider(chainId,config.ALCHEMY_API_KEY);
            const a2 = await outProvider.getTransactionCount(XMTP_LISTENER_PUB, "pending")
            console.log(" testing Alchemy Provider with getTransactionCount="+a2)
        } 
        else {
            const outProvider = await checkChainList(chainId,0);
        }
        


    }
    catch(error){
        console.log("try 1 error:"+error)
        try{ 
           outProvider = await checkChainList(chainId,0);
        }
        catch(error2){
            console.log("try 2 error:"+error2)
            try { 
                outProvider = await checkChainList(chainId,1);
            }
            catch(error3){
                console.log("try 3 error:"+error3)
                try { 
                outProvider = await checkChainList(chainId,2);
                } 
                catch(error4){
                    console.log("try 4 error:"+error4)
                    outProvider = await checkChainList(chainId,3);
                }
            }
        }
    }
    finally{
        if(outProvider!== undefined && outProvider!== null )
            working_rpc_providers[chainId]=outProvider;
        return outProvider;
    }

}
   

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
 

  if(!tx.hasOwnProperty('nonce')){
    const localprovider=await getKnownRPC(tx.chainId);
    tx.nonce = await localprovider.getTransactionCount(tx.from, "pending");
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
    if(typeof message === 'object'){
        message=JSON.stringify(message);
    }
    let res = await convo.send(message);
    last_id_i_sent=res.id;
}

 
async function xSignUtil(conversation,clean_tx){

    if(check_transaction_schema(clean_tx)){
        if( portfolioWallets_dict[clean_tx.from]){
        const signedTX= await portfolioWallets_dict[clean_tx.from].signTransaction(clean_tx);
 
        await xSendUtil(conversation,JSON.stringify( {...std_out_js,method:"reply_sign",signed:signedTX }));
        return signedTX;
        }
        else {
          const erstr2=msg_js.body.from+"wallet not under managment";
          throw new Error(erstr2); 
        }
    }
    else{ 
      throw new Error("Not Valid Transaction Format"); 
    }

}

 1===1; 

const method_options = [ "sign_eth","api","killall", "list_methods", "list_wallets","sign_and_send_eth"];

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
    bad_json:"bad_json",
    reply_sign_eth:"reply_sign_eth",
}


while(true){

  try { 
 console.log(`Starting to listen`);
 const conversation = await x_client.conversations.newConversation(XMTP_ACCOUNT_MANAGER_PUB);
 console.log("Conversation created", conversation);
 await xSendUtil(conversation,"hello world");


 let current_provider;
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
    if( !( message.senderAddress===XMTP_ACCOUNT_MANAGER_PUB ||   message.senderAddress===XMTP_LISTENER_PUB ))
        continue;

    console.log(`[${message.senderAddress}]: ${message.content}`);
    let msg_js;
    if( method_options.includes(message.content))  //to allow small methods to be send without wrapping json
        msg_js={ method:message.content }
    else 
        msg_js =  JSON.parse(message.content.replace(/(\r\n|\n|\r)/gm, ""))

    if( msg_js.hasOwnProperty('method') ){

      switch (msg_js.method) {
        case 'sign_eth':
          let tx_js = msg_js.body  
          const clean_tx = await prep_tx(tx_js);
          await xSignUtil(conversation,clean_tx);
        break;
        case 'sign_and_send_eth':
            const clean_tx2 = await prep_tx( msg_js.body );
            const signedTx = await xSignUtil(conversation,clean_tx2);
            current_provider= await getKnownRPC(clean_tx2.chainId);
            try {
                const send_resp = await current_provider.sendTransaction(signedTx);
                await xSendUtil(conversation, JSON.stringify({...std_out_js, tx_hash_onchain:send_resp.hash } ));
            } 
            catch(error_send){
                console.log("sendTransaction Error: "+ error_send)
                await xSendUtil(conversation, JSON.stringify({...std_error_js, error_message:error_send } ));
            }

        break;
        
        case "list_methods":
            await xSendUtil(conversation,{...std_out_js,list_methods:method_options});
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


