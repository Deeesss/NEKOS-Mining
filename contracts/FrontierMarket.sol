// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract FrontierMarket is EIP712 {
    using SafeERC20 for IERC20;

    bytes32 private constant ORDER_TYPEHASH =
        keccak256("DuskwearOrder(bytes32 orderId,address buyer,uint256 deadline)");

    IERC20 public immutable token;
    address public immutable treasury;
    address public immutable signer;
    uint256 public immutable price;
    mapping(bytes32 => address) public buyerOf;

    event DuskwearPurchased(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    error InvalidConfiguration();
    error OrderAlreadyPaid();
    error InvalidAuthorization();

    constructor(IERC20 token_, address treasury_, address signer_, uint256 price_) EIP712("NEKOS Frontier Market", "1") {
        if (address(token_).code.length == 0 || treasury_ == address(0) || signer_ == address(0) || price_ == 0) {
            revert InvalidConfiguration();
        }
        token = token_;
        treasury = treasury_;
        signer = signer_;
        price = price_;
    }

    function buyDuskwear(bytes32 orderId, uint256 deadline, bytes calldata signature) external {
        if (buyerOf[orderId] != address(0)) revert OrderAlreadyPaid();
        bytes32 authorization = _hashTypedDataV4(keccak256(abi.encode(ORDER_TYPEHASH, orderId, msg.sender, deadline)));
        if (block.timestamp > deadline || msg.sender == treasury || ECDSA.recover(authorization, signature) != signer) {
            revert InvalidAuthorization();
        }
        buyerOf[orderId] = msg.sender;
        token.safeTransferFrom(msg.sender, treasury, price);
        emit DuskwearPurchased(orderId, msg.sender, price);
    }
}
