// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract SmartEscrow is Ownable, ReentrancyGuard, Pausable {
    
    enum MilestoneStatus { Pending, InProgress, Completed, Released, Disputed }
    enum EscrowStatus { Active, Completed, Cancelled, Disputed }
    
    struct Milestone {
        uint256 id;
        uint256 amount;
        MilestoneStatus status;
        string description;
        uint256 deadline;
        uint256 completedAt;
        uint256 releasedAt;
        bool requiresSignature;
        uint8 signaturesRequired; // Number of required signatures (1 or 2)
        uint8 signaturesReceived;
    }
    
    struct Escrow {
        uint256 id;
        address payable buyer;
        address payable seller;
        address payable mediator;
        uint256 totalAmount;
        EscrowStatus status;
        uint256 createdAt;
        uint256 completedAt;
        string ipfsHash; // IPFS hash for off-chain data storage
    }
    
    struct MilestoneSignature {
        address signer;
        uint256 timestamp;
        bytes signature;
    }
    
    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => Milestone[]) public milestones;
    mapping(uint256 => mapping(uint256 => MilestoneSignature[])) public signatures; // escrowId => milestoneId => signatures
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasSignedMilestone; // escrowId => milestoneId => signerAddress => bool
    mapping(address => bool) public mediators; // Approved mediators
    
    uint256 public escrowCounter;
    uint256 public mediationFeePercentage; // Percentage fee for mediation, set by owner
    uint256 public totalFeeCollected;
    
    event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount);
    event MilestoneCreated(uint256 indexed escrowId, uint256 indexed milestoneId, uint256 amount);
    event MilestoneCompleted(uint256 indexed escrowId, uint256 indexed milestoneId);
    event MilestoneReleased(uint256 indexed escrowId, uint256 indexed milestoneId, uint256 amount);
    event MilestoneDisputed(uint256 indexed escrowId, uint256 indexed milestoneId);
    event MilestoneSignedBy(uint256 indexed escrowId, uint256 indexed milestoneId, address indexed signer);
    event EscrowCompleted(uint256 indexed escrowId);
    event EscrowCancelled(uint256 indexed escrowId);
    event FundsRefunded(uint256 indexed escrowId, address indexed recipient, uint256 amount);
    event MediatorAdded(address indexed mediator);
    event MediatorRemoved(address indexed mediator);
    
    modifier onlyBuyer(uint256 _escrowId) {
        require(msg.sender == escrows[_escrowId].buyer, "Only buyer can call this");
        _;
    }
    
    modifier onlyMediator(uint256 _escrowId) {
        require(msg.sender == escrows[_escrowId].mediator, "Only mediator can call this");
        _;
    }
    
    modifier escrowExists(uint256 _escrowId) {
        require(_escrowId > 0 && _escrowId <= escrowCounter, "Escrow does not exist");
        _;
    }
    
    modifier validMilestone(uint256 _escrowId, uint256 _milestoneId) {
        require(_milestoneId < milestones[_escrowId].length, "Milestone does not exist");
        _;
    }
    
    constructor() {
        escrowCounter = 0;
        mediationFeePercentage = 2; // Default to 2%
    }
    
    function createEscrow(
        address payable _seller,
        address payable _mediator,
        string memory _ipfsHash
    ) public payable returns (uint256) {
        require(msg.value > 0, "Amount must be greater than 0");
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Seller and buyer must be different");
        
        escrowCounter++;
        uint256 escrowId = escrowCounter;
        
        escrows[escrowId] = Escrow({
            id: escrowId,
            buyer: payable(msg.sender),
            seller: _seller,
            mediator: _mediator,
            totalAmount: msg.value,
            status: EscrowStatus.Active,
            createdAt: block.timestamp,
            completedAt: 0,
            ipfsHash: _ipfsHash
        });
        
        emit EscrowCreated(escrowId, msg.sender, _seller, msg.value);
        return escrowId;
    }
    
    function addMilestone(
        uint256 _escrowId,
        uint256 _amount,
        string memory _description,
        uint256 _deadline,
        bool _requiresSignature
    ) public whenNotPaused escrowExists(_escrowId) {
        Escrow storage escrow = escrows[_escrowId];
        require(msg.sender == escrow.buyer || msg.sender == escrow.seller, "Not authorized");
        require(escrow.status == EscrowStatus.Active, "Escrow is not active");
        require(_amount > 0, "Amount must be greater than 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        
        uint256 milestoneId = milestones[_escrowId].length;
        
        milestones[_escrowId].push(Milestone({
            id: milestoneId,
            amount: _amount,
            status: MilestoneStatus.Pending,
            description: _description,
            deadline: _deadline,
            completedAt: 0,
            releasedAt: 0,
            requiresSignature: _requiresSignature,
            signaturesRequired: _requiresSignature ? 2 : 0,
            signaturesReceived: 0
        }));
        
        emit MilestoneCreated(_escrowId, milestoneId, _amount);
    }
    
    function completeMilestone(
        uint256 _escrowId,
        uint256 _milestoneId
    ) public whenNotPaused escrowExists(_escrowId) validMilestone(_escrowId, _milestoneId) {
        Escrow storage escrow = escrows[_escrowId];
        Milestone storage milestone = milestones[_escrowId][_milestoneId];
        
        require(msg.sender == escrow.seller, "Only seller can complete milestone");
        require(milestone.status == MilestoneStatus.Pending || milestone.status == MilestoneStatus.InProgress, "Invalid milestone status");
        require(block.timestamp <= milestone.deadline, "Milestone deadline has passed");
        
        milestone.status = MilestoneStatus.Completed;
        milestone.completedAt = block.timestamp;
        
        emit MilestoneCompleted(_escrowId, _milestoneId);
    }
    
    function signMilestone(
        uint256 _escrowId,
        uint256 _milestoneId,
        bytes memory _signature
    ) public whenNotPaused escrowExists(_escrowId) validMilestone(_escrowId, _milestoneId) {
        Escrow storage escrow = escrows[_escrowId];
        Milestone storage milestone = milestones[_escrowId][_milestoneId];
        
        require(msg.sender == escrow.buyer || msg.sender == escrow.seller, "Not authorized");
        require(milestone.requiresSignature, "Milestone does not require signature");
        require(milestone.status == MilestoneStatus.Completed, "Milestone must be completed first");
        
        require(!hasSignedMilestone[_escrowId][_milestoneId][msg.sender], "Already signed by this user");
        
        signatures[_escrowId][_milestoneId].push(MilestoneSignature({
            signer: msg.sender,
            timestamp: block.timestamp,
            signature: _signature
        }));
        
        milestone.signaturesReceived++;
        hasSignedMilestone[_escrowId][_milestoneId][msg.sender] = true;
        
        emit MilestoneSignedBy(_escrowId, _milestoneId, msg.sender);
        
        if (milestone.signaturesReceived >= milestone.signaturesRequired) {
            releaseMilestone(_escrowId, _milestoneId);
        }
    }
    
    function releaseMilestone(
        uint256 _escrowId,
        uint256 _milestoneId
    ) public whenNotPaused nonReentrant escrowExists(_escrowId) validMilestone(_escrowId, _milestoneId) {
        Escrow storage escrow = escrows[_escrowId];
        Milestone storage milestone = milestones[_escrowId][_milestoneId];
        
        require(msg.sender == escrow.buyer || msg.sender == escrow.mediator || msg.sender == owner(), "Not authorized");
        require(milestone.status == MilestoneStatus.Completed, "Milestone must be completed");
        
        if (milestone.requiresSignature) {
            require(milestone.signaturesReceived >= milestone.signaturesRequired, "Not all signatures received");
        }
        
        milestone.status = MilestoneStatus.Released;
        milestone.releasedAt = block.timestamp;
        
        uint256 fee = (milestone.amount * mediationFeePercentage) / 100;
        uint256 amountToSeller = milestone.amount - fee;
        totalFeeCollected += fee;
        
        (bool success, ) = escrow.seller.call{value: amountToSeller}("");
        require(success, "Transfer failed");
        
        emit MilestoneReleased(_escrowId, _milestoneId, amountToSeller);
        
        checkAndCompleteEscrow(_escrowId);
    }
    
    function disputeMilestone(
        uint256 _escrowId,
        uint256 _milestoneId
    ) public whenNotPaused escrowExists(_escrowId) validMilestone(_escrowId, _milestoneId) {
        Escrow storage escrow = escrows[_escrowId];
        Milestone storage milestone = milestones[_escrowId][_milestoneId];
        
        require(msg.sender == escrow.buyer || msg.sender == escrow.seller, "Not authorized");
        require(milestone.status != MilestoneStatus.Released, "Milestone already released");
        
        milestone.status = MilestoneStatus.Disputed;
        escrow.status = EscrowStatus.Disputed;
        
        emit MilestoneDisputed(_escrowId, _milestoneId);
    }
    
    function resolveDispute(
        uint256 _escrowId,
        uint256 _milestoneId,
        bool _releaseToSeller
    ) public whenNotPaused onlyMediator(_escrowId) escrowExists(_escrowId) validMilestone(_escrowId, _milestoneId) nonReentrant {
        Milestone storage milestone = milestones[_escrowId][_milestoneId];
        Escrow storage escrow = escrows[_escrowId];
        
        require(milestone.status == MilestoneStatus.Disputed, "Milestone is not disputed");
        
        if (_releaseToSeller) {
            milestone.status = MilestoneStatus.Released;
            milestone.releasedAt = block.timestamp;
            
            uint256 fee = (milestone.amount * mediationFeePercentage) / 100;
            uint256 amountToSeller = milestone.amount - fee;
            totalFeeCollected += fee;
            
            (bool success, ) = escrow.seller.call{value: amountToSeller}("");
            require(success, "Transfer failed");
            
            emit MilestoneReleased(_escrowId, _milestoneId, amountToSeller);
        } else {
            milestone.status = MilestoneStatus.Pending;
            (bool success, ) = escrow.buyer.call{value: milestone.amount}("");
            require(success, "Refund failed");
        }
        
        escrow.status = EscrowStatus.Active;
        checkAndCompleteEscrow(_escrowId);
    }
    
    function checkAndCompleteEscrow(uint256 _escrowId) internal {
        Escrow storage escrow = escrows[_escrowId];
        Milestone[] storage milestonesArray = milestones[_escrowId];
        
        if (milestonesArray.length == 0) {
            return;
        }
        
        uint256 releasedCount = 0;
        for (uint256 i = 0; i < milestonesArray.length; i++) {
            if (milestonesArray[i].status == MilestoneStatus.Released) {
                releasedCount++;
            }
        }
        
        if (releasedCount == milestonesArray.length) {
            escrow.status = EscrowStatus.Completed;
            escrow.completedAt = block.timestamp;
            emit EscrowCompleted(_escrowId);
        }
    }
    
    function cancelEscrow(uint256 _escrowId) public whenNotPaused nonReentrant escrowExists(_escrowId) {
        Escrow storage escrow = escrows[_escrowId];
        require(msg.sender == escrow.buyer, "Only buyer can cancel");
        require(escrow.status == EscrowStatus.Active, "Escrow is not active");
        require(milestones[_escrowId].length == 0, "Cannot cancel escrow with milestones");
        
        escrow.status = EscrowStatus.Cancelled;
        
        (bool success, ) = escrow.buyer.call{value: escrow.totalAmount}("");
        require(success, "Refund failed");
        
        emit EscrowCancelled(_escrowId);
        emit FundsRefunded(_escrowId, escrow.buyer, escrow.totalAmount);
    }
    
    function addMediator(address _mediator) public onlyOwner whenNotPaused {
        require(_mediator != address(0), "Invalid mediator address");
        mediators[_mediator] = true;
        emit MediatorAdded(_mediator);
    }
    
    function removeMediator(address _mediator) public onlyOwner whenNotPaused {
        mediators[_mediator] = false;
        emit MediatorRemoved(_mediator);
    }

    function pause() public onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() public onlyOwner whenPaused {
        _unpause();
    }

    function setMediationFeePercentage(uint256 _newFeePercentage) public onlyOwner {
        require(_newFeePercentage <= 100, "Fee percentage cannot exceed 100%");
        mediationFeePercentage = _newFeePercentage;
    }
}
