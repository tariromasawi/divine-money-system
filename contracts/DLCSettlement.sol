// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DLCSettlement
 * @notice Settlement contract that records all DLC transactions as blockchain receipts
 * @dev Does not hold user funds - purely for on-chain record keeping
 * 
 * Identity Key: MKEY-MNM-TAC-001-2024
 * Organization: MASOWE FAITH GROUP LTD
 */
contract DLCSettlement is Ownable {
    
    address public gateway;
    
    // Record structures
    struct PurchaseRecord {
        address user;
        uint256 usdAmount;
        uint256 dlcAmount;
        bytes32 orderId;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    struct StakeRecord {
        address user;
        uint256 amount;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    struct SpendRecord {
        address user;
        uint256 amount;
        bytes32 productId;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    // Storage
    PurchaseRecord[] public purchases;
    StakeRecord[] public stakes;
    SpendRecord[] public spends;
    
    mapping(address => uint256[]) public userPurchases;
    mapping(address => uint256[]) public userStakes;
    mapping(address => uint256[]) public userSpends;
    mapping(bytes32 => bool) public processedOrders;
    
    // Statistics
    uint256 public totalPurchaseVolume;
    uint256 public totalStakeVolume;
    uint256 public totalSpendVolume;
    uint256 public uniqueUsers;
    mapping(address => bool) private knownUsers;
    
    // Events
    event PurchaseSettled(
        uint256 indexed recordId,
        address indexed user,
        uint256 usdAmount,
        uint256 dlcAmount,
        bytes32 indexed orderId
    );
    event StakeSettled(
        uint256 indexed recordId,
        address indexed user,
        uint256 amount
    );
    event SpendSettled(
        uint256 indexed recordId,
        address indexed user,
        uint256 amount,
        bytes32 indexed productId
    );
    event GatewayUpdated(address indexed oldGateway, address indexed newGateway);

    modifier onlyGateway() {
        require(msg.sender == gateway || msg.sender == owner(), "DLCSettlement: Not authorized");
        _;
    }

    constructor(address gateway_) Ownable(msg.sender) {
        gateway = gateway_;
    }

    /**
     * @notice Record a DLC purchase
     */
    function recordPurchase(
        address user,
        uint256 usdAmount,
        uint256 dlcAmount,
        bytes32 orderId
    ) external onlyGateway {
        require(!processedOrders[orderId], "DLCSettlement: Order already processed");
        
        processedOrders[orderId] = true;
        
        uint256 recordId = purchases.length;
        purchases.push(PurchaseRecord({
            user: user,
            usdAmount: usdAmount,
            dlcAmount: dlcAmount,
            orderId: orderId,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));
        
        userPurchases[user].push(recordId);
        totalPurchaseVolume += dlcAmount;
        
        if (!knownUsers[user]) {
            knownUsers[user] = true;
            uniqueUsers++;
        }
        
        emit PurchaseSettled(recordId, user, usdAmount, dlcAmount, orderId);
    }

    /**
     * @notice Record a DLC stake
     */
    function recordStake(
        address user,
        uint256 amount
    ) external onlyGateway {
        uint256 recordId = stakes.length;
        stakes.push(StakeRecord({
            user: user,
            amount: amount,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));
        
        userStakes[user].push(recordId);
        totalStakeVolume += amount;
        
        if (!knownUsers[user]) {
            knownUsers[user] = true;
            uniqueUsers++;
        }
        
        emit StakeSettled(recordId, user, amount);
    }

    /**
     * @notice Record a DLC spend
     */
    function recordSpend(
        address user,
        uint256 amount,
        bytes32 productId
    ) external onlyGateway {
        uint256 recordId = spends.length;
        spends.push(SpendRecord({
            user: user,
            amount: amount,
            productId: productId,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));
        
        userSpends[user].push(recordId);
        totalSpendVolume += amount;
        
        if (!knownUsers[user]) {
            knownUsers[user] = true;
            uniqueUsers++;
        }
        
        emit SpendSettled(recordId, user, amount, productId);
    }

    // View functions
    function getPurchaseCount() external view returns (uint256) {
        return purchases.length;
    }
    
    function getStakeCount() external view returns (uint256) {
        return stakes.length;
    }
    
    function getSpendCount() external view returns (uint256) {
        return spends.length;
    }
    
    function getUserPurchaseIds(address user) external view returns (uint256[] memory) {
        return userPurchases[user];
    }
    
    function getUserStakeIds(address user) external view returns (uint256[] memory) {
        return userStakes[user];
    }
    
    function getUserSpendIds(address user) external view returns (uint256[] memory) {
        return userSpends[user];
    }
    
    function getStats() external view returns (
        uint256 purchaseVolume,
        uint256 stakeVolume,
        uint256 spendVolume,
        uint256 purchaseCount,
        uint256 stakeCount,
        uint256 spendCount,
        uint256 users
    ) {
        return (
            totalPurchaseVolume,
            totalStakeVolume,
            totalSpendVolume,
            purchases.length,
            stakes.length,
            spends.length,
            uniqueUsers
        );
    }

    // Admin functions
    function setGateway(address newGateway) external onlyOwner {
        emit GatewayUpdated(gateway, newGateway);
        gateway = newGateway;
    }
}
