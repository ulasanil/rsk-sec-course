const { deployContracts } = require('../utils');
require('dotenv').config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const [lunaToken, oneMilNftPixels] = await deployContracts();

  console.log('LunaToken address:', lunaToken.address);
  console.log('OneMilNftPixels address:', oneMilNftPixels.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
