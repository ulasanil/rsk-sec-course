/**
 * Tracks fungible token balances
 * @param {*} balances balance object
 * @param {string} from balance name to withdraw tokens
 * @param {string} to balance name to top up tokens
 * @param {number} amount number of tokens to transfer
 */
function trackTransfer(balances, from, to, amount) {
  // allow to set only existing properties
  if (
    // isNaN comes first because it can "fail faster" than array testing
    Number.isNaN(amount) ||
    [balances[from], balances[to], amount].some((value) =>
      [undefined, null].includes(value),
    )
  )
    throw new Error('wrong balance tracker args');
  balances[from] -= amount;
  balances[to] += amount;
}

module.exports = trackTransfer;
