// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract NekosSpice is ERC20 {
    uint256 public constant TEST_SUPPLY = 100_000 ether;

    constructor() ERC20("NEKOS SPICE", "NKS") {
        _mint(msg.sender, TEST_SUPPLY);
    }
}
