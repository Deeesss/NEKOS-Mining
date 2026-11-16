// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract SpiceRewards is EIP712 {
    using SafeERC20 for IERC20;

    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address player,uint256 amount,bytes32 nonce,uint256 deadline)");

    IERC20 public immutable token;
    address public immutable signer;
    mapping(bytes32 => bool) public used;

    event Claimed(bytes32 indexed nonce, address indexed player, uint256 amount);
    error InvalidConfiguration();
    error InvalidAuthorization();
    error ExpiredAuthorization();
    error AlreadyClaimed();

    constructor(IERC20 token_, address signer_) EIP712("NEKOS SPICE Rewards", "1") {
        if (address(token_).code.length == 0 || signer_ == address(0)) revert InvalidConfiguration();
        token = token_;
        signer = signer_;
    }

    function claim(uint256 amount, bytes32 nonce, uint256 deadline, bytes calldata signature) external {
        if (block.timestamp > deadline) revert ExpiredAuthorization();
        if (used[nonce]) revert AlreadyClaimed();
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(CLAIM_TYPEHASH, msg.sender, amount, nonce, deadline))
        );
        if (amount == 0 || ECDSA.recover(digest, signature) != signer) revert InvalidAuthorization();
        used[nonce] = true;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(nonce, msg.sender, amount);
    }
}
