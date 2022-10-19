## Description

This project is a clone of the one of the modules in rsk-dev-course. It was audited by the RSK security team priorly and there was no high or critical issues raised during the audit. So we assume currently the code doesn't contain any vulnerabilities. Instead of finding vulnerabilities (let us know if you find one!), what we want from you is to introduce one or multiple vulnerabilities to the smart contracts. 

Feel free to get creative as much as you want :) You can add new functions or modify the existing functions. As long as the OneMilNftPixels contract maintains its core functionality (which is being an NFT contract) everything is fair-play. For example, some ideas that might help you get started:

* Smart contract owner account (admin) wants fees from NFT purchases and wants to withdraw the collacted fees with a function call. Can you make it exploitable? 

* Instead of using ERC1363 tokens developers decide to go with plain ERC20 tokens. Would that introduce new vulnerabilities or break the functionality? 

* Do ERC1363 tokens contain some "weird" functionality that can be exploited? 


## Instructions

To start, please clone to repo and run the following commands:

`npm install` - Installs the dependencies.

`npm run compile` - Compiles the smart contracts using hardhat. 

`npm run test` - Runs the tests in hardhat network. (Should complete without any errors)

`npm run deploy` - Deploys the contracts to the RSK Regtest network. (RSK Regtest network needs to be configured in the hardhat.config.js file)


## Smart Contracts

**OneMilNftPixels.sol:** An ERC721 contract. It has 1,000,000 NFTs. Users can purchase NFTs with LunaTokens. After a OneMilNftPixels NFT is purchased, its price will be updated. OneMilNftPixels NFTs can be re-purchased by paying the new price. As such, owners of the OneMilNftPixels NFTs will change as the NFTs are re-purchased. 

**LunaToken.sol:** A token based on ERC1363 standard. OneMilNftPixels NFT project intends to accept this token with purchases. 

**MeowToken.sol:** Another ERC1363 token. This is used for testing purposes.

**PurrToken.sol** An ERC20 token for testing.    


## Useful Resources

Following resources might help or inspire you while completing this task:

* https://consensys.github.io/smart-contract-best-practices/attacks/
* https://github.com/crytic/not-so-smart-contracts
* https://github.com/sirhashalot/SCV-List


