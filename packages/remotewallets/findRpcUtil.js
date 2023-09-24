//deprecated
//MOVED to utils.js
import * as config from './config.js';

import * as ethers  from  "ethers";

export async function  checkChainList(chainId,trycount){
    const found_chainlists=chainlist.getChainById(chainId);
 
    if( found_chainlists.rpc[trycount]=== undefined ){
     throw new Error('ChainList didnt find a network for chainid '+chainId+" idx "+trycount); 
    }
    const provider = new ethers.providers.JsonRpcProvider(found_chainlists.rpc[trycount]);
    const a2 = await provider.getTransactionCount(XMTP_LISTENER_PUB, "pending")
    console.log(" testing chainlist Provider with getTransactionCount="+a2)
    return provider;

}
export async function getKnownRPC(chainId){
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