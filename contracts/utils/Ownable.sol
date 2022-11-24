// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract Ownable {
    address public owner;

    constructor() {
        transferOwnership(msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(
            newOwner != address(0),
            "Ownable: newOwner is the zero address"
        );
        owner = newOwner;
    }
}
