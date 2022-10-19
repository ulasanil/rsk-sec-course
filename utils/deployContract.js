/**
 *  Reduces the number of one smart contract deployment code lines into one.
 * @param {string} contractName smart contract name
 * @param  {...any} params smart contract constructor parameters
 * @returns deployed smart contract object
 */
async function deployContract(contractName, ...params) {
  const contractFactory = await ethers.getContractFactory(contractName);
  const smartContract = await contractFactory.deploy(...params);
  await smartContract.deployed();
  return smartContract;
}

module.exports = deployContract;
