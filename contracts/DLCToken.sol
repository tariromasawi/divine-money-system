// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title DLCToken - Daily Light Credits
 * @notice Gasless meta-transaction enabled token for MASOWE Global Ledger
 * @dev Implements ERC-2771 for gasless transactions via trusted forwarder
 * 
 * Identity Key: MKEY-MNM-TAC-001-2024
 * Owner: HRH SAINT TARIRO MASAWI
 * Organization: MASOWE FAITH GROUP LTD
 */
contract DLCToken is ERC2771Context, Ownable, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;

    // Token metadata
    string public constant name = "Daily Light Credits";
    string public constant symbol = "DLC";
    uint8 public constant decimals = 8;
    
    // Genesis identity
    string public constant GENESIS_KEY = "MKEY-MNM-TAC-001-2024";
    
    // Balances and allowances
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    
    // Staking
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 apy; // basis points (1200 = 12%)
        bool active;
    }
    mapping(address => Stake[]) public stakes;
    uint256 public stakingAPY = 1200; // 12% default
    uint256 public minStakeAmount = 10 * 10**8; // 10 DLC minimum
    
    // Nonces for replay protection
    mapping(address => uint256) public nonces;
    
    // Rate limiting
    mapping(address => uint256) public lastActionTime;
    uint256 public minActionInterval = 1; // 1 second between actions
    
    // Emergency controls
    bool public paused;
    uint256 public maxTransferAmount = 1000000 * 10**8; // 1M DLC max per tx
    
    // EIP-712 type hashes
    bytes32 public constant TRANSFER_TYPEHASH = keccak256(
        "Transfer(address from,address to,uint256 amount,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant STAKE_TYPEHASH = keccak256(
        "Stake(address user,uint256 amount,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant UNSTAKE_TYPEHASH = keccak256(
        "Unstake(address user,uint256 stakeIndex,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant PURCHASE_TYPEHASH = keccak256(
        "Purchase(address buyer,bytes32 productId,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    // Events
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event Staked(address indexed user, uint256 amount, uint256 stakeIndex);
    event Unstaked(address indexed user, uint256 amount, uint256 rewards, uint256 stakeIndex);
    event Purchase(address indexed buyer, bytes32 indexed productId, uint256 amount);
    event MetaTransactionExecuted(address indexed user, bytes32 indexed intentHash, string action);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    // Modifiers
    modifier whenNotPaused() {
        require(!paused, "DLC: Contract is paused");
        _;
    }
    
    modifier rateLimit(address user) {
        require(
            block.timestamp >= lastActionTime[user] + minActionInterval,
            "DLC: Rate limit exceeded"
        );
        lastActionTime[user] = block.timestamp;
        _;
    }

    constructor(
        address trustedForwarder_,
        address initialOwner_,
        uint256 initialSupply_
    ) 
        ERC2771Context(trustedForwarder_) 
        Ownable(initialOwner_)
        EIP712("DailyLightCredits", "1")
    {
        // Mint initial supply to owner (genesis allocation)
        _balances[initialOwner_] = initialSupply_;
        _totalSupply = initialSupply_;
        emit Transfer(address(0), initialOwner_, initialSupply_);
    }

    // ============================================
    // ERC-20 STANDARD FUNCTIONS
    // ============================================
    
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address to, uint256 amount) 
        public 
        whenNotPaused 
        rateLimit(_msgSender())
        returns (bool) 
    {
        _transfer(_msgSender(), to, amount);
        return true;
    }
    
    function allowance(address owner_, address spender) public view returns (uint256) {
        return _allowances[owner_][spender];
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) 
        public 
        whenNotPaused
        rateLimit(_msgSender())
        returns (bool) 
    {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    // ============================================
    // META-TRANSACTION FUNCTIONS (GASLESS)
    // ============================================
    
    /**
     * @notice Execute a gasless transfer via signed intent
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @param deadline Expiry timestamp
     * @param signature EIP-712 signature
     */
    function metaTransfer(
        address from,
        address to,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused nonReentrant rateLimit(from) {
        require(block.timestamp <= deadline, "DLC: Signature expired");
        require(amount <= maxTransferAmount, "DLC: Amount exceeds limit");
        
        uint256 currentNonce = nonces[from];
        
        bytes32 structHash = keccak256(abi.encode(
            TRANSFER_TYPEHASH,
            from,
            to,
            amount,
            currentNonce,
            deadline
        ));
        
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        
        require(signer == from, "DLC: Invalid signature");
        
        nonces[from]++;
        _transfer(from, to, amount);
        
        emit MetaTransactionExecuted(from, digest, "TRANSFER");
    }
    
    /**
     * @notice Execute a gasless stake via signed intent
     * @param user Staker address
     * @param amount Amount to stake
     * @param deadline Expiry timestamp
     * @param signature EIP-712 signature
     */
    function metaStake(
        address user,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused nonReentrant rateLimit(user) {
        require(block.timestamp <= deadline, "DLC: Signature expired");
        require(amount >= minStakeAmount, "DLC: Below minimum stake");
        
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
        
        require(signer == user, "DLC: Invalid signature");
        require(_balances[user] >= amount, "DLC: Insufficient balance");
        
        nonces[user]++;
        
        // Lock tokens for staking
        _balances[user] -= amount;
        
        stakes[user].push(Stake({
            amount: amount,
            startTime: block.timestamp,
            apy: stakingAPY,
            active: true
        }));
        
        emit Staked(user, amount, stakes[user].length - 1);
        emit MetaTransactionExecuted(user, digest, "STAKE");
    }
    
    /**
     * @notice Execute a gasless unstake via signed intent
     * @param user Staker address
     * @param stakeIndex Index of stake to withdraw
     * @param deadline Expiry timestamp
     * @param signature EIP-712 signature
     */
    function metaUnstake(
        address user,
        uint256 stakeIndex,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused nonReentrant rateLimit(user) {
        require(block.timestamp <= deadline, "DLC: Signature expired");
        require(stakeIndex < stakes[user].length, "DLC: Invalid stake index");
        require(stakes[user][stakeIndex].active, "DLC: Stake not active");
        
        uint256 currentNonce = nonces[user];
        
        bytes32 structHash = keccak256(abi.encode(
            UNSTAKE_TYPEHASH,
            user,
            stakeIndex,
            currentNonce,
            deadline
        ));
        
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        
        require(signer == user, "DLC: Invalid signature");
        
        nonces[user]++;
        
        Stake storage stake = stakes[user][stakeIndex];
        stake.active = false;
        
        // Calculate rewards
        uint256 timeStaked = block.timestamp - stake.startTime;
        uint256 rewards = (stake.amount * stake.apy * timeStaked) / (365 days * 10000);
        uint256 totalReturn = stake.amount + rewards;
        
        // Mint rewards and return principal
        _balances[user] += totalReturn;
        _totalSupply += rewards;
        
        emit Unstaked(user, stake.amount, rewards, stakeIndex);
        emit MetaTransactionExecuted(user, digest, "UNSTAKE");
    }
    
    /**
     * @notice Execute a gasless product purchase via signed intent
     * @param buyer Buyer address
     * @param productId Product identifier hash
     * @param amount DLC amount to spend
     * @param deadline Expiry timestamp
     * @param signature EIP-712 signature
     */
    function metaPurchase(
        address buyer,
        bytes32 productId,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused nonReentrant rateLimit(buyer) {
        require(block.timestamp <= deadline, "DLC: Signature expired");
        require(amount <= maxTransferAmount, "DLC: Amount exceeds limit");
        
        uint256 currentNonce = nonces[buyer];
        
        bytes32 structHash = keccak256(abi.encode(
            PURCHASE_TYPEHASH,
            buyer,
            productId,
            amount,
            currentNonce,
            deadline
        ));
        
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        
        require(signer == buyer, "DLC: Invalid signature");
        require(_balances[buyer] >= amount, "DLC: Insufficient balance");
        
        nonces[buyer]++;
        
        // Transfer to treasury (owner)
        _transfer(buyer, owner(), amount);
        
        emit Purchase(buyer, productId, amount);
        emit MetaTransactionExecuted(buyer, digest, "PURCHASE");
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getStakes(address user) external view returns (Stake[] memory) {
        return stakes[user];
    }
    
    function getActiveStakeCount(address user) external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < stakes[user].length; i++) {
            if (stakes[user][i].active) count++;
        }
        return count;
    }
    
    function getPendingRewards(address user) external view returns (uint256) {
        uint256 totalRewards = 0;
        for (uint256 i = 0; i < stakes[user].length; i++) {
            if (stakes[user][i].active) {
                Stake memory stake = stakes[user][i];
                uint256 timeStaked = block.timestamp - stake.startTime;
                uint256 rewards = (stake.amount * stake.apy * timeStaked) / (365 days * 10000);
                totalRewards += rewards;
            }
        }
        return totalRewards;
    }
    
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(_msgSender());
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(_msgSender());
    }
    
    function setStakingAPY(uint256 newAPY) external onlyOwner {
        require(newAPY <= 5000, "DLC: APY too high"); // Max 50%
        stakingAPY = newAPY;
    }
    
    function setMinStakeAmount(uint256 newMin) external onlyOwner {
        minStakeAmount = newMin;
    }
    
    function setMaxTransferAmount(uint256 newMax) external onlyOwner {
        maxTransferAmount = newMax;
    }
    
    function setMinActionInterval(uint256 newInterval) external onlyOwner {
        minActionInterval = newInterval;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _balances[to] += amount;
        _totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================
    
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "DLC: Transfer from zero");
        require(to != address(0), "DLC: Transfer to zero");
        require(_balances[from] >= amount, "DLC: Insufficient balance");
        
        _balances[from] -= amount;
        _balances[to] += amount;
        
        emit Transfer(from, to, amount);
    }
    
    function _approve(address owner_, address spender, uint256 amount) internal {
        require(owner_ != address(0), "DLC: Approve from zero");
        require(spender != address(0), "DLC: Approve to zero");
        
        _allowances[owner_][spender] = amount;
        emit Approval(owner_, spender, amount);
    }
    
    function _spendAllowance(address owner_, address spender, uint256 amount) internal {
        uint256 currentAllowance = _allowances[owner_][spender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "DLC: Insufficient allowance");
            _allowances[owner_][spender] = currentAllowance - amount;
        }
    }

    // ============================================
    // ERC-2771 OVERRIDES
    // ============================================
    
    function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }
    
    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }
    
    function _contextSuffixLength() internal view override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }
}
