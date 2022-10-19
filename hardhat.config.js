require('@nomiclabs/hardhat-waffle');

module.exports = {
  solidity: '0.8.1',
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    rskregtest: {
      url: 'http://localhost:4444',
    },
  },
};
