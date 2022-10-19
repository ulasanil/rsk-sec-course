const { expect } = require('chai');
require('dotenv').config();
const { deployContracts, trackTransfer } = require('../utils');

// Luna token balance tracker
const lunaBalance = {
  deployer: Number(process.env.LUNA_TOTAL_SUPPLY),
  buyer1: 0,
  buyer2: 0,
  oneMilNftPixels: 0,
};

describe('LunaToken', () => {
  const lunasToTransfer = 100;

  let deployAcct;
  let buyer1Acct;
  let buyer2Acct;
  let lunaToken;
  let oneMilNftPixels;

  before(async () => {
    [deployAcct, buyer1Acct, buyer2Acct] = await ethers.getSigners();
    [lunaToken, oneMilNftPixels] = await deployContracts();
  });

  describe('Upon deployment', () => {
    it('total supply must be minted', async () => {
      const tokensMinted = await lunaToken.totalSupply();
      expect(tokensMinted).to.equal(lunaBalance.deployer);
    });

    it('must conform to ERC1363', async () => {
      // as described in the specification https://eips.ethereum.org/EIPS/eip-1363
      const isConforming = await lunaToken.supportsInterface('0xb0202a11');
      expect(isConforming).to.be.true;
    });
  });

  describe('Transfers', () => {
    it('can transfer Lunas between accounts', async () => {
      // tranfer lunes from deployer to the buyers
      await lunaToken
        .transfer(buyer1Acct.address, lunasToTransfer)
        .then((txResponse) => txResponse.wait());
      trackTransfer(lunaBalance, 'deployer', 'buyer1', lunasToTransfer);

      await lunaToken
        .transfer(buyer2Acct.address, lunasToTransfer)
        .then((txResponse) => txResponse.wait());
      trackTransfer(lunaBalance, 'deployer', 'buyer2', lunasToTransfer);

      expect(await lunaToken.balanceOf(buyer1Acct.address)).to.equal(
        lunaBalance.buyer1,
      );
      expect(await lunaToken.balanceOf(buyer2Acct.address)).to.equal(
        lunaBalance.buyer2,
      );
      expect(await lunaToken.balanceOf(deployAcct.address)).to.equal(
        lunaBalance.deployer,
      );

      // transfer them back from buyers to deployer
      await lunaToken
        .connect(buyer1Acct)
        .transfer(deployAcct.address, lunasToTransfer)
        .then((txResponse) => txResponse.wait());
      trackTransfer(lunaBalance, 'buyer1', 'deployer', lunasToTransfer);

      await lunaToken
        .connect(buyer2Acct)
        .transfer(deployAcct.address, lunasToTransfer)
        .then((txResponse) => txResponse.wait());
      trackTransfer(lunaBalance, 'buyer2', 'deployer', lunasToTransfer);

      expect(await lunaToken.balanceOf(buyer1Acct.address)).to.equal(
        lunaBalance.buyer1,
      );
      expect(await lunaToken.balanceOf(buyer2Acct.address)).to.equal(
        lunaBalance.buyer2,
      );
      expect(await lunaToken.balanceOf(deployAcct.address)).to.equal(
        lunaBalance.deployer,
      );
    });

    it('deployer can send Lunas to NFT and NFT can receive Lunas', async () => {
      await lunaToken
        .connect(deployAcct)
        .transfer(oneMilNftPixels.address, lunasToTransfer)
        .then((txResponse) => txResponse.wait());
      trackTransfer(
        lunaBalance,
        'deployer',
        'oneMilNftPixels',
        lunasToTransfer,
      );

      const nftLunaBalance = await lunaToken.balanceOf(oneMilNftPixels.address);
      const deployerLunaBalance = await lunaToken.balanceOf(deployAcct.address);
      expect(nftLunaBalance).to.equal(lunaBalance.oneMilNftPixels);
      expect(deployerLunaBalance).to.equal(lunaBalance.deployer);
    });

    it('buyer can send Lunas to NFT', async () => {
      await lunaToken
        .connect(deployAcct)
        .transfer(buyer1Acct.address, lunasToTransfer)
        .then((txResponse) => txResponse.wait());
      trackTransfer(lunaBalance, 'deployer', 'buyer1', lunasToTransfer);

      await lunaToken
        .connect(buyer1Acct)
        .transfer(oneMilNftPixels.address, lunasToTransfer)
        .then((txResponse) => txResponse.wait());
      trackTransfer(lunaBalance, 'buyer1', 'oneMilNftPixels', lunasToTransfer);

      expect(await lunaToken.balanceOf(oneMilNftPixels.address)).to.equal(
        lunaBalance.oneMilNftPixels,
      );
      expect(await lunaToken.balanceOf(buyer1Acct.address)).to.equal(
        lunaBalance.buyer1,
      );
    });

    it('can transfer 0 Lunas', async () => {
      await lunaToken
        .connect(deployAcct)
        .transfer(oneMilNftPixels.address, 0)
        .then((txResponse) => txResponse.wait());
      const nftLunaBalance = await lunaToken.balanceOf(oneMilNftPixels.address);
      const deployerLunaBalance = await lunaToken.balanceOf(deployAcct.address);
      expect(nftLunaBalance).to.equal(lunaBalance.oneMilNftPixels);
      expect(deployerLunaBalance).to.equal(lunaBalance.deployer);
    });
  });
});
