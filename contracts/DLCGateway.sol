// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DLCGateway
 * @notice Gateway contract for DLC actions - accepts backend-signed transactions
 * @dev Records all DLC actions on-chain for transparency
 * 
 * Identity Key: MKEY-MNM-TAC-001-2024
 * Organization: MASOWE FAITH GROUP LTD
 */
contract DLCGateway is Ownable, EIP712, ReentrancyGuard {
    using ECDSA for bytes32;

    address public trustedForwarder;
    address public backendSigner;
    address public settlementContract;
    
    // Nonces for replay protection
    mapping(address => uint256) public nonces;
    
    // Action type hashes
    bytes32 public constant PURCHASE_TYPEHASH = keccak256(
        "Purchase(address user,uint256 usdAmount,uint256 dlcAmount,bytes32 orderId,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant STAKE_TYPEHASH = keccak256(
        "Stake(address user,uint256 amount,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant SPEND_TYPEHASH = keccak256(
        "Spend(address user,uint256 amount,bytes32 productId,uint256 nonce,uint256 deadline)"
    );

    // Events
    event DLCPurchased(
        address indexed user,
        uint256 usdAmount,
        uint256 dlcAmount,
        bytes32 indexed orderId,
        uint256 timestamp
    );
    event DLCStaked(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    event DLCSpent(
        address indexed user,
        uint256 amount,
        bytes32 indexed productId,
        uint256 timestamp
    );
    event BackendSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event SettlementContractUpdated(address indexed oldContract, address indexed newContract);
    event ForwarderUpdated(address indexed oldForwarder, address indexed newForwarder);

    modifier onlyTrusted() {
        require(
            msg.sender == owner() || msg.sender == trustedForwarder,
            "DLCGateway: Not authorized"
        );
        _;
    }

    constructor(
        address trustedForwarder_,
        address backendSigner_
    ) EIP712("MasoweDLCGateway", "1") Ownable(msg.sender) {
        trustedForwarder = trustedForwarder_;
        backendSigner = backendSigner_;
    }

    /**
     * @notice Record a DLC purchase (fiat to DLC)
     * @param user User address
     * @param usdAmount Amount in USD cents
     * @param dlcAmount Amount of DLC (8 decimals)
     * @param orderId Unique order identifier
     * @param deadline Signature expiry
     * @param signature Backend signature
     */
    function recordPurchase(
        address user,
        uint256 usdAmount,
        uint256 dlcAmount,
        bytes32 orderId,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        require(block.timestamp <= deadline, "DLCGateway: Expired");
        
        uint256 currentNonce = nonces[user];
        
        bytes32 structHash = keccak256(abi.encode(
            PURCHASE_TYPEHASH,
            user,
            usdAmount,
            dlcAmount,
            orderId,
            currentNonce,
            deadline
        ));
        
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        
        require(signer == backendSigner, "DLCGateway: Invalid signature");
        
        nonces[user]++;
        
        emit DLCPurchased(user, usdAmount, dlcAmount, orderId, block.timestamp);
        
        // Forward to settlement if configured
        if (settlementContract != address(0)) {
            IDLCSettlement(settlementContract).recordPurchase(user, usdAmount, dlcAmount, orderId);
        }
    }

    /**
     * @notice Record a DLC stake action
     * @param user User address
     * @param amount Amount staked (8 decimals)
     * @param deadline Signature expiry
     * @param signature Backend signature
     */
    function recordStake(
        address user,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        require(block.timestamp <= deadline, "DLCGateway: Expired");
        
        uint256 currentNonce = nonces[user];
        
        bytes32 structHash = keccak256(abi.encode(
            STAKE_TYPEHASH,
            user,
            amount,
            currentNonce,
            deadline
        ));
        
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        
        require(signer == backendSigner, "DLCGateway: Invalid signature");
        
        nonces[user]++;
        
        emit DLCStaked(user, amount, block.timestamp);
        
        if (settlementContract != address(0)) {
            IDLCSettlement(settlementContract).recordStake(user, amount);
        }
    }

    /**
     * @notice Record a DLC spend (product purchase)
     * @param user User address
     * @param amount Amount spent (8 decimals)
     * @param productId Product identifier
     * @param deadline Signature expiry
     * @param signature Backend signature
     */
    function recordSpend(
        address user,
        uint256 amount,
        bytes32 productId,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        require(block.timestamp <= deadline, "DLCGateway: Expired");
        
        uint256 currentNonce = nonces[user];
        
        bytes32 structHash = keccak256(abi.encode(
            SPEND_TYPEHASH,
            user,
            amount,
            productId,
            currentNonce,
            deadline
        ));
        
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        
        require(signer == backendSigner, "DLCGateway: Invalid signature");
        
        nonces[user]++;
        
        emit DLCSpent(user, amount, productId, block.timestamp);
        
        if (settlementContract != address(0)) {
            IDLCSettlement(settlementContract).recordSpend(user, amount, productId);
        }
    }

    // Admin functions
    function setBackendSigner(address newSigner) external onlyOwner {
        emit BackendSignerUpdated(backendSigner, newSigner);
        backendSigner = newSigner;
    }

    function setSettlementContract(address newSettlement) external onlyOwner {
        emit SettlementContractUpdated(settlementContract, newSettlement);
        settlementContract = newSettlement;
    }

    function setTrustedForwarder(address newForwarder) external onlyOwner {
        emit ForwarderUpdated(trustedForwarder, newForwarder);
        trustedForwarder = newForwarder;
    }

    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}

interface IDLCSettlement {
    function recordPurchase(address user, uint256 usdAmount, uint256 dlcAmount, bytes32 orderId) external;
    function recordStake(address user, uint256 amount) external;
    function recordSpend(address user, uint256 amount, bytes32 productId) external;
}
