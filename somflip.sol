// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SomFlip {
    address public owner;
    mapping(address => uint256) public balances;

    event FlipResult(address indexed player, uint256 betAmount, string choice, string result, uint256 payout);
    
    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    function flipCoin(string memory _choice) external payable {
        require(msg.value == 0.01 ether || msg.value == 0.05 ether || msg.value == 0.1 ether || msg.value == 0.25 ether || msg.value == 0.5 ether || msg.value == 1 ether, "Invalid bet amount");
        require(address(this).balance >= msg.value * 2, "Contract balance too low");
        
       
        uint256 randomResult = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % 2;
        string memory result = randomResult == 0 ? "Tails" : "Heads";
        
        uint256 payout = 0;
        if (keccak256(abi.encodePacked(_choice)) == keccak256(abi.encodePacked(result))) {
           
            payout = msg.value * 2;
            payable(msg.sender).transfer(payout);
        }
        
        emit FlipResult(msg.sender, msg.value, _choice, result, payout);
    }

    function withdrawFunds(uint256 amount) external {
        require(msg.sender == owner, "Only owner can withdraw");
        require(amount <= address(this).balance, "Insufficient contract balance");
        payable(owner).transfer(amount);
    }
}
