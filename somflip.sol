// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SomFlip {
    address public owner;
    mapping(address => uint256) public balances;
    
    bool private lock; // Reentrancy lock
    
    event FlipResult(address indexed player, uint256 betAmount, string choice, string result, uint256 payout);

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    
    function generateRandomNumber() private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,  
            msg.sender,
            block.number
        )));
    }

  
    modifier noReentrancy() {
        require(!lock, "Reentrancy is not allowed");
        lock = true;
        _;
        lock = false;
    }

    function flipCoin(string memory _choice) external payable noReentrancy {
        require(
            msg.value == 0.01 ether || msg.value == 0.05 ether || msg.value == 0.1 ether || msg.value == 0.25 ether || msg.value == 0.5 ether || msg.value == 1 ether,
            "Invalid bet amount"
        );
        
     
        uint256 requiredBalance = msg.value * 2;
        require(address(this).balance >= requiredBalance, "Contract balance too low");

       
        uint256 randomResult = generateRandomNumber() % 2; // 0: Tails, 1: Heads
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
