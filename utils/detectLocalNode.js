require('dotenv').config();

// determines whether the test is running on a local or global test blockchain node
async function detectLocalNode() {
  // 31337 - hardhat network chain ID
  // 5757, 5777 - possible Ganache chain IDs
  const localNodes = [31337, 5757, 5777];
  // beforehand check .env parameter
  if (process.env.TEST_LOCAL_NODE === 'true') return true;
  const { chainId } = await ethers.provider.getNetwork();
  return localNodes.includes(chainId);
}

module.exports = detectLocalNode;
