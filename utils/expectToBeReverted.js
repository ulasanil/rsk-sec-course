const { expect } = require('chai');
const detectLocalNode = require('./detectLocalNode.js');
// Checks if transaction is reverted.
// This function is needed because the transaction revert reason is different
// on local and global test blockchain nodes. On global nodes the revert reason
// may not be specified by a blockchain
async function expectToBeReverted({ tx, reason }) {
  if (!(tx && reason))
    throw new Error('you must specify a transaction revert reason');
  const isLocalNode = await detectLocalNode();
  if (isLocalNode) {
    return expect(tx).to.be.revertedWith(reason);
  }
  return expect(tx).to.be.reverted;
};

module.exports = expectToBeReverted;
