const deployContract = require('./deployContract.js');
require('dotenv').config();

/**
 * Deploys LunaToken and OneMilNftPixels consequently
 * @returns an array containing deployed smart contracts
 */
async function deployContracts() {
  const lunaToken = await deployContract(
    'LunaToken',
    process.env.LUNA_TOTAL_SUPPLY,
  );
  const oneMilNftPixels = await deployContract(
    'OneMilNftPixels',
    lunaToken.address,
  );

  return [lunaToken, oneMilNftPixels];
}

module.exports = deployContracts;
