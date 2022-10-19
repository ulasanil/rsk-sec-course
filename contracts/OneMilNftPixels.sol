// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "erc-payable-token/contracts/token/ERC1363/IERC1363.sol";
import "erc-payable-token/contracts/token/ERC1363/IERC1363Receiver.sol";

contract OneMilNftPixels is ERC721, Ownable, IERC1363Receiver {
  
  uint256 public minPriceIncrement;
  uint256 public updatePrice;
  struct Pixel {
    bytes3 colour;
    uint256 price;
  }
  Pixel[1_000_000] public pixels;

  /**
  * @dev The ERC1363 token accepted
  */
  IERC1363 public acceptedToken;

  /**
  * @dev Emitted when the owner of a pixel updates it
  */
  event Update(uint24 indexed tokenId);

  /**
  * @dev Emitted when the contract owner performs admin
  */
  event OwnerAdmin();

  /**
  * @dev Emitted when `amount` tokens are moved from one account (`sender`) to
  * this by operator (`operator`) using {transferAndCall} or {transferFromAndCall}.
  */
  event TokensReceived(address indexed operator, address indexed sender, uint256 amount, bytes data);

  /**
  * @dev Emitted when the allowance of this for a `sender` is set by
  * a call to {approveAndCall}. `amount` is the new allowance.
  */
  event TokensApproved(address indexed sender, uint256 amount, bytes data);

  modifier acceptedTokenOnly() {
    require(_msgSender() == address(acceptedToken), "ERC1363Payable: accepts purchases in Lunas only");
    _;
  }

  constructor(IERC1363 _acceptedToken)
    ERC721("OneMilNftPixels", "NFT1MPX")
    Ownable()
  {
    require(address(_acceptedToken) != address(0), "ERC1363Payable: acceptedToken is zero address");
    require(_acceptedToken.supportsInterface(type(IERC1363).interfaceId), "Your token doesn't support ERC1363");
    acceptedToken = _acceptedToken;

    minPriceIncrement = 10;
    updatePrice = 10;
  }

  /**
  * @dev See {IERC165-supportsInterface}.
  */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return
            interfaceId == type(IERC1363Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }

  /**
  * @dev Purchase pixel and update its colour.
  * If pixel is not currently owned, NFT is minted.
  * If pixel is already owned, NFT is transferred.
  *
  * - `id` is the offset of the pixel, where `offset = y * width + x`
  * - `colour` is an RGB value in hexadecimal,
  *   e.g. `0xFF00FF` is `rgb(255, 0, 255)` (purple)
  */
   function buy(
      uint24 id,
      bytes3 colour,
      address sender,
      uint256 amount
   ) acceptedTokenOnly public {
      Pixel storage pixel = pixels[id];
      require(
        amount >= pixel.price + minPriceIncrement,
        "should increment on current price"
      );
      pixel.colour = colour;
      pixel.price = amount;
      if (ERC721._exists(id)) {
        // purchasing an pixel already in existence
        ERC721._transfer(ERC721.ownerOf(id), sender, id);
      } else {
        // purchasing a previously untouched pixel
        ERC721._safeMint(sender, id);
      }
   }

  /**
   * @dev Purchase pixel and update its colour
   *
   * - `id` is the offset of the pixel, where `offset = y * width + x`.
   *   Assuming 1e6 pixels in a square, this is `offset = y * 1000 + x`.
   * - `colour` is an RGB value in hexadecimal,
   *   e.g. `0xFF00FF` is `rgb(255, 0, 255)` (purple).
   */
   function update(
    uint24 id,
    bytes3 colour,
    address sender,
    uint256 amount
  ) acceptedTokenOnly public {
    require(
      amount >= updatePrice,
      "should pay update price"
    );
    require(
      ERC721.ownerOf(id) == sender,
      "only owner allowed"
    );
    Pixel storage pixel = pixels[id];
    pixel.colour = colour;

    emit Update(id);
  }

  function ownerAdmin(
    bool withdraw,
    uint256 minPriceIncrementNew,
    uint256 updatePriceNew
  )
    onlyOwner
    public
  {
    minPriceIncrement = minPriceIncrementNew;
    updatePrice = updatePriceNew;
    if (withdraw) {
      // check Luna balance of the current NFT contract
      uint balance = IERC1363(acceptedToken).balanceOf(address(this));
      if (balance > 0) {
        // transfer all Lunas to the NFT owner's address
        bool success = IERC1363(acceptedToken).transfer(Ownable(this).owner(), balance);
        require(success, "send failed");
      }
    }
    emit OwnerAdmin();
  }

  /**
   * @notice Handle the receipt of ERC1363 tokens
   * @dev Any ERC1363 smart contract calls this function on the recipient
   * after a `transfer` or a `transferFrom`. This function MAY throw to revert and reject the
   * transfer. Return of other than the magic value MUST result in the
   * transaction being reverted.
   * Note: the token contract address is always the message sender.
   * @param operator address The address which called `transferAndCall` or `transferFromAndCall` function
   * @param sender address The address which are token transferred from
   * @param amount uint256 The amount of tokens transferred
   * @param data bytes Additional data with no specified format
   * @return `bytes4(keccak256("onTransferReceived(address,address,uint256,bytes)"))`
   *  unless throwing
   */
  function onTransferReceived(address operator, address sender, uint256 amount, bytes calldata data)
  acceptedTokenOnly external override (IERC1363Receiver) returns (bytes4) {
    require(amount > 0, "Stop fooling me! Are you going to pay?");

    emit TokensReceived(operator, sender, amount, data);

    _transferReceived(sender, amount, data);

    return IERC1363Receiver(this).onTransferReceived.selector;
  }

  /**
  * @dev Decodes 'onTransferReceived' method 'data' parameter
  * @dev https://github.com/ethereum/solidity/issues/6012
  */
  function callDataDecode(bytes memory data) private pure returns (bytes4 selector, uint24 id, bytes3 colour) {
    assembly {
      // mload(0xAB) Loads the word (32byte) located at the memory address 0xAB.
      selector := mload(add(data, add(0x20, 0)))
      id := mload(add(data, 36))
      colour := mload(add(data, 68))
    }
  }

  /**
  * @dev Called after validating a `onTransferReceived`.
  * @param sender The address which are token transferred from
  * @param amount The amount of tokens transferred
  * @param data Additional data with no specified format
  */
    function _transferReceived(
        address sender,
        uint256 amount,
        bytes memory data
    ) private {
        
        bytes4 buySelector = this.buy.selector;
        bytes4 updateSelector = this.update.selector;

        (bytes4 selector, uint24 pixelId, bytes3 colour) =
          callDataDecode(data);

        require(
          selector == buySelector || selector == updateSelector,
          'Call of an unknown function'
        );

        if (selector == buySelector) {
          buy(pixelId, colour, sender, amount); 
        } else if (selector == updateSelector) {
          update(pixelId, colour, sender, amount); 
        } 
    }
}
