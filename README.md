# TechDemo for a Remote Control EOA for gas efficient flexible for funds management teams with varying levels of permission. Using XMTP and Metamask Snaps

 [Slides Version](https://docs.google.com/presentation/d/1vVlIzecuM3Ygytb4Ri8u-TUexXOBdKxedEF2qH66qyA/edit?usp=sharing).



* Accidentally got deleted in a merge failure but we build a demo for technical users also that explains the system well,  see this past commit [https://github.com/JidoTaikaSuru/remote-control-eoa/blob/afbdc932755d7282d4f5b61d57358d8a862153d1/packages/remotewallets/example_account_manager_node_script.js](https://github.com/JidoTaikaSuru/remote-control-eoa/blob/afbdc932755d7282d4f5b61d57358d8a862153d1/packages/remotewallets/example_account_manager_node_script.js)
* Video demoing the Snaps recording of transactions sending over XMTP to server which then replays it on protected wallets [https://vimeo.com/867649913](https://vimeo.com/867649913)
 

## The Problem
In many situations it takes a team to best manage investments in a crypto account
not just the beneficial owner.

If we want to strive for a world free of government regulation on the movement of
our assets and more resilience from fuckups like Alameta Research we need to
advance shared account/asset management tooling

## The Solution

A simple server which is only controlled by the beneficial owner keeps the private keys safe but gives remote access (over xmtp) to signing transactions by authorized third parties under certain constraints. 

Technical account managers can run existing trading algorithms (ethers.js or web3.py based code) on any system of their choosing giving complete flexibility and code reuse. 

Non technical account managers can use our tools to record browser actions (using metamask-snaps) and save them as reusable scripts. As well as executing those scripts potentially over 100s of wallets simultaneously. 


## The Impact

AirDrop farming today is a sketchy industry with people sharing private keys to “trusted partners” plagued with lower level developers inserting backdoors into their scripts or personally draining assets over night. RemoteEOA could turn this into a legit investment strategy accessible to anyone. 

Account Abstraction is coming but it is not here yet on most chains and automated traders know that anything that causes even a tiny amount of extra gas or delay in getting a transaction submitted puts them at a disadvantage hence won’t get used. RemoteEOA can provide many of the advantages of Account Abstraction without the extra gas. 

## Future Developments 

* Community
    * Script sharing repository. If scripts are ready to be run without risks due to account restrictions people can try them out and rate them without a technical person doing an audit of the script first. 
    * A leaderboard of who made the most gains in a certain chain/token at the lowest gas fees
    *  Matchmaking with account managers than can offer their expertise in AirDrop farming, bridge hack quick recovery skills or arbitrage algo trading… With our system proving their track record and still not Doxing the managers. 
* Tech
    * Add remote controlling of centralized exchange accounts with harder restrictions and more flexibility than the native API would give as they are never intended to be used by 3rd parties.
    * To go legit the RemoteEOA server needs good audits we kept the code intentionally small server side. 
    * We’ll add HTTP as communication channel for teams that have secure internal networks setup. 


- Babel is used for transpiling TypeScript to JavaScript, so when building with the CLI,
  `transpilationMode` must be set to `localOnly` (default) or `localAndDeps`.
