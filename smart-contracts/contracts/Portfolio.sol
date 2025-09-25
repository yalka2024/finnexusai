// smart-contracts/contracts/Portfolio.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Portfolio {
    address public owner;
    mapping(address => uint256) public balances;
    mapping(address => mapping(string => uint256)) public assets;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function addAsset(string memory assetId, uint256 amount) external {
        assets[msg.sender][assetId] = amount;
    }

    function getPortfolio(address user) external view returns (uint256, string[] memory) {
        string[] memory empty = new string[](0);
        return (balances[user], empty);
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
}
