// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title DLCForwarder - Trusted Forwarder for DLC Meta-Transactions
 * @notice This is the trusted forwarder that relays gasless transactions
 * @dev Extends OpenZeppelin's ERC2771Forwarder
 */
contract DLCForwarder is ERC2771Forwarder {
    constructor(string memory name) ERC2771Forwarder(name) {}
}
