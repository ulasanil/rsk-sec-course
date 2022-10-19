const { expect, use } = require('chai');
use(require('chai-as-promised'));
const {
  deployContracts,
  deployContract,
  trackTransfer,
  expectToBeReverted,
} = require('../utils');
require('dotenv').config();

// Token balance trackers

const lunaBalance = {
  deployer: Number(process.env.LUNA_TOTAL_SUPPLY),
  buyer: 0,
  oneMilNftPixels: 0,
};
const meowBalance = {
  deployer: 1e6,
  oneMilNftPixels: 0,
};
const purrBalance = {
  deployer: 1e6,
  oneMilNftPixels: 0,
};

describe('OneMilNftPixels', () => {
  let deployAcct;
  let buyer1Acct;
  let lunaToken;
  let oneMilNftPixels;

  // addidional tokens for the failure scenarios
  // ERC1363 compliant
  let meowToken;
  // ERC20 compliant
  let purrToken;

  const pixelDefaultColour = '0xff00ff';
  const yellow = '0xffff0a';

  // Sends transaction to the ERC1363 'transferAndCall(address,uint256,bytes)' function
  // @param {*} token ERC1363 compliant deployed token object
  // @param {string} action 'buy' or 'update' function reference
  // @param {number} id pixel ID
  // @param {string} colour HEX colour in a format '0x123456'
  // @param {string} account Luna tokens sender address in a format '0x...'
  // @param {number} tokenAmount number of tokens to transfer
  // @returns transaction result promise resolving to the function selector code

  const transferAndCall = async ({
    token,
    action,
    id,
    colour,
    account,
    tokenAmount,
  }) => {
    if (
      [action, id, colour, account, tokenAmount, token].some(
        (param) => param === undefined,
      )
    )
      throw new Error('transaction parameter is missing');

    const callData = oneMilNftPixels.interface.encodeFunctionData(action, [
      id,
      colour,
      account.address,
      tokenAmount,
    ]);
    const funcSignature = 'transferAndCall(address,uint256,bytes)';
    if (!token[funcSignature]) throw new Error('Incompatible token');
    return token
      .connect(account)
      [funcSignature](oneMilNftPixels.address, tokenAmount, callData);
  };

  // deploy contracts once - before all the tests

  before(async () => {
    [deployAcct, buyer1Acct] = await ethers.getSigners();
    [lunaToken, oneMilNftPixels] = await deployContracts();

    meowToken = await deployContract('MeowToken', meowBalance.deployer);
    purrToken = await deployContract('PurrToken', purrBalance.deployer);
  });

  describe('Upon deployment', () => {
    it('should have an owner', async () => {
      expect(await oneMilNftPixels.owner()).to.equal(deployAcct.address);
    });

    it('should have a zero Luna balance', async () => {
      expect(await lunaToken.balanceOf(oneMilNftPixels.address)).to.equal(
        lunaBalance.oneMilNftPixels,
      );
    });

    it('should have empty colour for pixel #0', async () => {
      const pixel0 = await oneMilNftPixels.pixels(0);
      expect(pixel0.colour).to.equal('0x000000');
    });

    it('should have zero price for pixel #0', async () => {
      const pixel0 = await oneMilNftPixels.pixels(0);
      expect(pixel0.price).to.equal(0);
    });

    it('should have no owner for pixel #0', async () => {
      await expectToBeReverted({
        tx: oneMilNftPixels.ownerOf(0),
        reason: 'ERC721: invalid token ID',
      });
    });

    it('should have Luna token as an accepted token', async () => {
      expect(await oneMilNftPixels.acceptedToken()).to.equal(lunaToken.address);
    });
  });

  describe('buy pixel (mint)', () => {
    describe('failure', () => {
      const pixel1001Id = 1001;

      it('should not allow to call buy function directly', async () => {
        const tx = oneMilNftPixels
          .connect(deployAcct)
          .buy(pixel1001Id, pixelDefaultColour, deployAcct.address, 99)
          .then((txResponse) => txResponse.wait());
        await expectToBeReverted({
          tx,
          reason: 'ERC1363Payable: accepts purchases in Lunas only',
        });
      });

      it('should not allow to buy pixels with any other ERC1363 compliant token other than Luna Token, namely with MeowToken', async () => {
        const tx = transferAndCall({
          // an extraneous ERC1363 token
          token: meowToken,
          action: 'buy',
          id: pixel1001Id,
          colour: pixelDefaultColour,
          account: deployAcct,
          tokenAmount: 0,
        }).then((txResponse) => txResponse.wait());
        await expectToBeReverted({
          tx,
          reason: 'ERC1363Payable: accepts purchases in Lunas only',
        });
      });

      it('should not allow to buy pixels with any other ERC20 compliant token other than Luna Token, namely with PurrToken', async () => {
        const tx = transferAndCall({
          // an extraneous ERC20 token
          token: purrToken,
          action: 'buy',
          id: pixel1001Id,
          colour: pixelDefaultColour,
          account: deployAcct,
          tokenAmount: 0,
        }).then((txResponse) => txResponse.wait());
        await expect(tx).to.be.rejectedWith('Incompatible token');
      });

      it('Meow and Purr token balances should not change after failed buy attempt', async () => {
        expect(await meowToken.balanceOf(deployAcct.address)).to.equal(
          meowBalance.deployer,
        );
        expect(await meowToken.balanceOf(oneMilNftPixels.address)).to.equal(
          meowBalance.oneMilNftPixels,
        );
        expect(await purrToken.balanceOf(deployAcct.address)).to.equal(
          purrBalance.deployer,
        );
        expect(await purrToken.balanceOf(oneMilNftPixels.address)).to.equal(
          purrBalance.oneMilNftPixels,
        );
      });

      it('should not allow anyone to purchase pixel with zero (0) Lunas', async () => {
        const tx = transferAndCall({
          token: lunaToken,
          action: 'buy',
          id: pixel1001Id,
          colour: pixelDefaultColour,
          account: deployAcct,
          tokenAmount: 0,
        }).then((txResponse) => txResponse.wait());
        await expectToBeReverted({
          tx,
          reason: 'Stop fooling me! Are you going to pay?',
        });
      });

      it('should not allow anyone to purchase pixels if he doesnt have Lunas', async () => {
        const tx = transferAndCall({
          token: lunaToken,
          action: 'buy',
          id: pixel1001Id,
          colour: pixelDefaultColour,
          account: buyer1Acct,
          tokenAmount: 100,
        }).then((txResponse) => txResponse.wait());
        await expectToBeReverted({
          tx,
          reason: 'ERC20: transfer amount exceeds balance',
        });
      });

      it('should not allow anyone to purchase pixel with low payment', async () => {
        const tx = transferAndCall({
          token: lunaToken,
          action: 'buy',
          id: pixel1001Id,
          colour: pixelDefaultColour,
          account: deployAcct,
          tokenAmount: 1,
        }).then((txResponse) => txResponse.wait());
        await expectToBeReverted({
          tx,
          reason: 'should increment on current price',
        });
      });

      it('should not have increased balance of contract after failed buy attempts', async () => {
        expect(await lunaToken.balanceOf(oneMilNftPixels.address)).to.equal(
          lunaBalance.oneMilNftPixels,
        );
      });
    });

    describe('success', () => {
      const pixel1001Id = 1001;
      const lunasToPay = 10;
      it('should allow to buy pixel 1001 and make it purple', async () => {
        await expect(
          transferAndCall({
            token: lunaToken,
            action: 'buy',
            id: pixel1001Id,
            colour: pixelDefaultColour,
            account: deployAcct,
            tokenAmount: lunasToPay,
          }),
        )
          .to.emit(oneMilNftPixels, 'Transfer')
          .withArgs(
            ethers.constants.AddressZero,
            deployAcct.address,
            pixel1001Id,
          );
        trackTransfer(lunaBalance, 'deployer', 'oneMilNftPixels', lunasToPay);
      });

      it('should have set the colour of pixel 1001 after buy', async () => {
        const pixel1001 = await oneMilNftPixels.pixels(pixel1001Id);
        expect(pixel1001.colour).to.equal(pixelDefaultColour);
      });

      it('should have set the price of pixel 1001 after buy', async () => {
        const pixel1001 = await oneMilNftPixels.pixels(pixel1001Id);
        expect(pixel1001.price).to.equal(lunasToPay);
      });

      it('should have update owner of pixel 1001 after buy', async () => {
        expect(await oneMilNftPixels.ownerOf(pixel1001Id)).to.equal(
          deployAcct.address,
        );
      });

      it('should have increased balance of contract after buy', async () => {
        expect(await lunaToken.balanceOf(oneMilNftPixels.address)).to.equal(
          lunaBalance.oneMilNftPixels,
        );
      });
    });

    describe('re-buy pixel (transfer)', () => {
      const pixel1001Id = 1001;
      const pixel1001Price = 10;

      before(async () => {
        // give some Lunas to another account
        await lunaToken.connect(deployAcct).transfer(buyer1Acct.address, 100);
        trackTransfer(lunaBalance, 'deployer', 'buyer', 100);
      });

      describe('failure', () => {
        it('pixel 1001 should already belong to the deployer', async () => {
          expect(await oneMilNftPixels.ownerOf(pixel1001Id)).to.equal(
            deployAcct.address,
          );
        });

        it('should not allow buyer1Acct to re-purchase pixel without payment', async () => {
          const tx = transferAndCall({
            token: lunaToken,
            action: 'buy',
            id: pixel1001Id,
            colour: yellow,
            account: buyer1Acct,
            tokenAmount: 0,
          }).then((txResponse) => txResponse.wait());
          await expectToBeReverted({
            tx,
            reason: 'Stop fooling me! Are you going to pay?',
          });
        });

        it('should not allow buyer1Acct to re-purchase pixel with low payment', async () => {
          const tx = transferAndCall({
            token: lunaToken,
            action: 'buy',
            id: pixel1001Id,
            colour: yellow,
            account: buyer1Acct,
            tokenAmount: pixel1001Price + 1,
          }).then((txResponse) => txResponse.wait());
          await expectToBeReverted({
            tx,
            reason: 'should increment on current price',
          });
        });

        it('should not have increased balance of contract after failed buy attempts', async () => {
          expect(await lunaToken.balanceOf(oneMilNftPixels.address)).to.equal(
            lunaBalance.oneMilNftPixels,
          );
        });
      });

      describe('success', () => {
        const newPrice = pixel1001Price * 2;

        it('pixel 1001 should already belong to the deployer', async () => {
          expect(await oneMilNftPixels.ownerOf(pixel1001Id)).to.equal(
            deployAcct.address,
          );
        });

        it('should allow buyer1Acct to buy pixel 1001 and make it yellow', async () => {
          await expect(
            transferAndCall({
              token: lunaToken,
              action: 'buy',
              id: pixel1001Id,
              colour: yellow,
              account: buyer1Acct,
              tokenAmount: newPrice,
            }),
          )
            .to.emit(oneMilNftPixels, 'Transfer')
            .withArgs(deployAcct.address, buyer1Acct.address, pixel1001Id);
          trackTransfer(lunaBalance, 'buyer', 'oneMilNftPixels', newPrice);
        });

        it('should have set the colour of pixel 1001 after purchase', async () => {
          const pixel1001 = await oneMilNftPixels.pixels(pixel1001Id);
          expect(pixel1001.colour).to.equal(yellow);
        });

        it('should have set the price of pixel 1001 after purchase', async () => {
          const pixel1001 = await oneMilNftPixels.pixels(pixel1001Id);
          expect(pixel1001.price).to.equal(newPrice);
        });

        it('should have update owner of pixel 1001 after purchase', async () => {
          expect(await oneMilNftPixels.ownerOf(pixel1001Id)).to.equal(
            buyer1Acct.address,
          );
        });

        it('should have increased balance of contract after re-buy', async () => {
          expect(await lunaToken.balanceOf(oneMilNftPixels.address)).to.equal(
            lunaBalance.oneMilNftPixels,
          );
        });
      });
    });

    describe('update pixel by owner', () => {
      const pixel1002Id = 1002;
      const pixelPrice = 10;
      const updatePrice = 10;

      before(async () => {
        // deployer buys a pixel 1002
        await transferAndCall({
          token: lunaToken,
          action: 'buy',
          id: pixel1002Id,
          colour: pixelDefaultColour,
          account: deployAcct,
          tokenAmount: pixelPrice,
        }).then((txResponse) => txResponse.wait());
        trackTransfer(lunaBalance, 'deployer', 'oneMilNftPixels', pixelPrice);
      });

      describe('failure', () => {
        it('should not allow deployer to update pixel without payment', async () => {
          const tx = transferAndCall({
            token: lunaToken,
            action: 'update',
            id: pixel1002Id,
            colour: yellow,
            account: deployAcct,
            tokenAmount: 0,
          }).then((txResponse) => txResponse.wait());
          await expectToBeReverted({
            tx,
            reason: 'Stop fooling me! Are you going to pay?',
          });
        });

        it('should not allow depolyer to update pixel with low payment', async () => {
          const tx = transferAndCall({
            token: lunaToken,
            action: 'update',
            id: pixel1002Id,
            colour: yellow,
            account: deployAcct,
            tokenAmount: 5,
          }).then((txResponse) => txResponse.wait());
          await expectToBeReverted({ tx, reason: 'should pay update price' });
        });

        it('should not have increased balance of contract after failed buy attempts', async () => {
          expect(await lunaToken.balanceOf(oneMilNftPixels.address)).to.equal(
            lunaBalance.oneMilNftPixels,
          );
        });
      });

      describe('success', () => {
        it('should allow deployer to update pixel', async () => {
          await expect(
            transferAndCall({
              token: lunaToken,
              action: 'update',
              id: pixel1002Id,
              colour: yellow,
              account: deployAcct,
              tokenAmount: updatePrice,
            }),
          )
            .to.emit(oneMilNftPixels, 'Update')
            .withArgs(pixel1002Id);
          trackTransfer(
            lunaBalance,
            'deployer',
            'oneMilNftPixels',
            updatePrice,
          );
        });

        it('should have set the colour of pixel 1002 after update', async () => {
          const pixel = await oneMilNftPixels.pixels(pixel1002Id);
          expect(pixel.colour).to.equal(yellow);
        });

        it('should maintain the same price of pixel 1002 after update', async () => {
          const pixel = await oneMilNftPixels.pixels(pixel1002Id);
          expect(pixel.price).to.equal(pixelPrice);
        });

        it('should maintain the same owner of pixel 1002 after update', async () => {
          expect(await oneMilNftPixels.ownerOf(pixel1002Id)).to.equal(
            deployAcct.address,
          );
        });

        it('should have increased balance of contract after update', async () => {
          expect(await lunaToken.balanceOf(oneMilNftPixels.address)).to.equal(
            lunaBalance.oneMilNftPixels,
          );
        });
      });
    });

    describe('update pixel by non-owner', () => {
      const pixel1002Id = 1002;
      const pixelPrice = 10;
      const updatePrice = 10;

      describe('failure', () => {
        it('should not allow deployer to update unowned pixel', async () => {
          const tx = transferAndCall({
            token: lunaToken,
            action: 'update',
            id: 1003,
            colour: yellow,
            account: deployAcct,
            tokenAmount: updatePrice,
          }).then((txResponse) => txResponse.wait());
          await expectToBeReverted({
            tx,
            reason: 'ERC721: invalid token ID',
          });
        });

        it('should not allow buyer1Acct to update pixel that they do not own', async () => {
          const tx = transferAndCall({
            token: lunaToken,
            action: 'update',
            id: pixel1002Id,
            account: buyer1Acct,
            tokenAmount: updatePrice,
            colour: pixelDefaultColour,
          }).then((txResponse) => txResponse.wait());
          await expectToBeReverted({ tx, reason: 'only owner allowed' });
        });

        it('should maintain the previous colour of pixel 1002 after failed update attempt', async () => {
          const pixel = await oneMilNftPixels.pixels(pixel1002Id);
          expect(pixel.colour).to.equal(yellow);
        });

        it('should maintain the previous price of pixel 1002 after failed update attempt', async () => {
          const pixel = await oneMilNftPixels.pixels(pixel1002Id);
          expect(pixel.price).to.equal(pixelPrice);
        });

        it('should maintain the previous owner of pixel 1002 after failed update attempt', async () => {
          expect(await oneMilNftPixels.ownerOf(pixel1002Id)).to.equal(
            deployAcct.address,
          );
        });
      });
    });

    describe('owner admin by non-owner', () => {
      const minPriceIncrementOld = 10; // Lunas
      const updatePriceOld = 10;
      const minPriceIncrementNew = 20;
      const updatePriceNew = 20;

      describe('failure', () => {
        it('should not allow non-owner to perform admin function', async () => {
          const tx = oneMilNftPixels
            .connect(buyer1Acct)
            .ownerAdmin(true, minPriceIncrementNew, updatePriceNew)
            .then((txResponse) => txResponse.wait());
          await expectToBeReverted({
            tx,
            reason: 'Ownable: caller is not the owner',
          });
        });

        it('should maintain the previous min price increment after failed admin attempt', async () => {
          expect(await oneMilNftPixels.minPriceIncrement()).to.equal(
            minPriceIncrementOld,
          );
        });

        it('should maintain the previous update price after failed admin attempt', async () => {
          expect(await oneMilNftPixels.updatePrice()).to.equal(updatePriceOld);
        });

        it('should have same balance in contract after failed admin attempt', async () => {
          expect(await lunaToken.balanceOf(oneMilNftPixels.address)).to.equal(
            lunaBalance.oneMilNftPixels,
          );
        });
      });
    });

    describe('owner admin by the owner', () => {
      const minPriceIncrementOld = 10; // Lunas
      const updatePriceOld = 10;
      const minPriceIncrementNew = 20;
      const updatePriceNew = 20;

      describe('success', () => {
        it('should allow owner to perform admin function - without withdrawal', async () => {
          await expect(
            oneMilNftPixels
              .connect(deployAcct)
              .ownerAdmin(false, minPriceIncrementNew, updatePriceNew),
          ).to.emit(oneMilNftPixels, 'OwnerAdmin');
        });

        it('should update to new min price increment after owner admin', async () => {
          expect(await oneMilNftPixels.minPriceIncrement()).to.equal(
            minPriceIncrementNew,
          );
        });

        it('should update to new update price after owner admin', async () => {
          expect(await oneMilNftPixels.updatePrice()).to.equal(updatePriceNew);
        });

        it('should have same balance in contract after owner admin without withdrawal', async () => {
          expect(await lunaToken.balanceOf(oneMilNftPixels.address)).to.equal(
            lunaBalance.oneMilNftPixels,
          );
        });

        it('should allow owner to perform admin function with withdrawal', async () => {
          await expect(
            oneMilNftPixels
              .connect(deployAcct)
              .ownerAdmin(true, minPriceIncrementOld, updatePriceOld),
          ).to.emit(oneMilNftPixels, 'OwnerAdmin');
          trackTransfer(
            lunaBalance,
            'oneMilNftPixels',
            'deployer',
            lunaBalance.oneMilNftPixels,
          );
        });

        it('should have zero balance in contract after owner admin with withdrawal', async () => {
          expect(await lunaToken.balanceOf(oneMilNftPixels.address)).to.equal(
            lunaBalance.oneMilNftPixels,
          );
        });

        it('deployer account should receive Lunas from NFT after the withdrowal', async () => {
          expect(await lunaToken.balanceOf(deployAcct.address)).to.equal(
            lunaBalance.deployer,
          );
        });
      });
    });
  });
});
