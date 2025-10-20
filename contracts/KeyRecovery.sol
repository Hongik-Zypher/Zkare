// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./KeyRegistry.sol";

contract KeyRecovery {
    KeyRegistry public keyRegistry;
    
    struct Guardian {
        address walletAddress;
        string name;
        string contact; // 연락처 (전화번호 등)
        bool isActive;
    }
    
    struct RecoveryRequest {
        address user;
        uint256 timestamp;
        uint256 expiryTime;
        uint256 approvalCount;
        bool isCompleted;
        bool isCancelled;
        mapping(address => bool) hasApproved;
        mapping(address => bool) hasRejected;
    }
    
    // 사용자별 보호자 정보 (최대 3명)
    mapping(address => Guardian[3]) public userGuardians;
    mapping(address => uint256) public guardianCount;
    
    // 복구 요청 관리
    mapping(bytes32 => RecoveryRequest) public recoveryRequests;
    mapping(address => bytes32) public activeRecoveryRequest;
    
    // 상수
    uint256 public constant RECOVERY_DURATION = 24 hours;
    uint256 public constant REQUIRED_APPROVALS = 2;
    uint256 public constant MAX_GUARDIANS = 3;
    
    // 이벤트
    event GuardiansSet(address indexed user, address[3] guardians, string[3] names);
    event RecoveryRequested(address indexed user, bytes32 indexed requestId, uint256 expiryTime);
    event RecoveryApproved(bytes32 indexed requestId, address indexed guardian);
    event RecoveryRejected(bytes32 indexed requestId, address indexed guardian);
    event RecoveryCompleted(address indexed user, bytes32 indexed requestId, string newPublicKey);
    event RecoveryCancelled(address indexed user, bytes32 indexed requestId);
    
    constructor(address _keyRegistryAddress) {
        keyRegistry = KeyRegistry(_keyRegistryAddress);
    }
    
    // 보호자 설정 (최초 1회만)
    function setGuardians(
        address[3] memory _guardianAddresses,
        string[3] memory _guardianNames,
        string[3] memory _guardianContacts
    ) external {
        require(guardianCount[msg.sender] == 0, "Guardians already set");
        require(keyRegistry.isPublicKeyRegistered(msg.sender), "User must register public key first");
        
        // 보호자 주소 유효성 검사
        for(uint i = 0; i < MAX_GUARDIANS; i++) {
            require(_guardianAddresses[i] != address(0), "Invalid guardian address");
            require(_guardianAddresses[i] != msg.sender, "Cannot set self as guardian");
            require(bytes(_guardianNames[i]).length > 0, "Guardian name cannot be empty");
            
            // 중복 보호자 체크
            for(uint j = i + 1; j < MAX_GUARDIANS; j++) {
                require(_guardianAddresses[i] != _guardianAddresses[j], "Duplicate guardian address");
            }
            
            userGuardians[msg.sender][i] = Guardian({
                walletAddress: _guardianAddresses[i],
                name: _guardianNames[i],
                contact: _guardianContacts[i],
                isActive: true
            });
        }
        
        guardianCount[msg.sender] = MAX_GUARDIANS;
        emit GuardiansSet(msg.sender, _guardianAddresses, _guardianNames);
    }
    
    // 복구 요청 생성
    function requestRecovery() external returns (bytes32) {
        require(guardianCount[msg.sender] == MAX_GUARDIANS, "Guardians not set");
        require(activeRecoveryRequest[msg.sender] == bytes32(0), "Recovery already in progress");
        
        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, block.timestamp, block.number));
        
        RecoveryRequest storage request = recoveryRequests[requestId];
        request.user = msg.sender;
        request.timestamp = block.timestamp;
        request.expiryTime = block.timestamp + RECOVERY_DURATION;
        request.approvalCount = 0;
        request.isCompleted = false;
        request.isCancelled = false;
        
        activeRecoveryRequest[msg.sender] = requestId;
        
        emit RecoveryRequested(msg.sender, requestId, request.expiryTime);
        return requestId;
    }
    
    // 보호자 승인
    function approveRecovery(bytes32 _requestId) external {
        RecoveryRequest storage request = recoveryRequests[_requestId];
        
        require(request.user != address(0), "Invalid recovery request");
        require(block.timestamp <= request.expiryTime, "Recovery request expired");
        require(!request.isCompleted, "Recovery already completed");
        require(!request.isCancelled, "Recovery request cancelled");
        require(!request.hasApproved[msg.sender], "Already approved");
        require(!request.hasRejected[msg.sender], "Already rejected");
        
        // 승인자가 등록된 보호자인지 확인
        bool isGuardian = false;
        for(uint i = 0; i < MAX_GUARDIANS; i++) {
            if(userGuardians[request.user][i].walletAddress == msg.sender && 
               userGuardians[request.user][i].isActive) {
                isGuardian = true;
                break;
            }
        }
        require(isGuardian, "Not a registered guardian");
        
        request.hasApproved[msg.sender] = true;
        request.approvalCount++;
        
        emit RecoveryApproved(_requestId, msg.sender);
    }
    
    // 보호자 거부
    function rejectRecovery(bytes32 _requestId) external {
        RecoveryRequest storage request = recoveryRequests[_requestId];
        
        require(request.user != address(0), "Invalid recovery request");
        require(block.timestamp <= request.expiryTime, "Recovery request expired");
        require(!request.isCompleted, "Recovery already completed");
        require(!request.isCancelled, "Recovery request cancelled");
        require(!request.hasApproved[msg.sender], "Already approved");
        require(!request.hasRejected[msg.sender], "Already rejected");
        
        // 거부자가 등록된 보호자인지 확인
        bool isGuardian = false;
        for(uint i = 0; i < MAX_GUARDIANS; i++) {
            if(userGuardians[request.user][i].walletAddress == msg.sender && 
               userGuardians[request.user][i].isActive) {
                isGuardian = true;
                break;
            }
        }
        require(isGuardian, "Not a registered guardian");
        
        request.hasRejected[msg.sender] = true;
        
        emit RecoveryRejected(_requestId, msg.sender);
    }
    
    // 새 키로 복구 완료
    function completeRecovery(bytes32 _requestId, string memory _newPublicKey) external {
        RecoveryRequest storage request = recoveryRequests[_requestId];
        
        require(request.user == msg.sender, "Not request owner");
        require(request.approvalCount >= REQUIRED_APPROVALS, "Not enough approvals");
        require(block.timestamp <= request.expiryTime, "Recovery request expired");
        require(!request.isCompleted, "Recovery already completed");
        require(!request.isCancelled, "Recovery request cancelled");
        require(bytes(_newPublicKey).length > 0, "New public key cannot be empty");
        
        // 복구 완료 처리
        request.isCompleted = true;
        activeRecoveryRequest[msg.sender] = bytes32(0);
        
        // KeyRegistry에서 공개키 업데이트 (updatePublicKeyFor 사용)
        keyRegistry.updatePublicKeyFor(msg.sender, _newPublicKey);
        
        emit RecoveryCompleted(msg.sender, _requestId, _newPublicKey);
    }
    
    // 복구 요청 취소 (요청자만 가능)
    function cancelRecovery(bytes32 _requestId) external {
        RecoveryRequest storage request = recoveryRequests[_requestId];
        
        require(request.user == msg.sender, "Not request owner");
        require(!request.isCompleted, "Recovery already completed");
        require(!request.isCancelled, "Recovery already cancelled");
        
        request.isCancelled = true;
        activeRecoveryRequest[msg.sender] = bytes32(0);
        
        emit RecoveryCancelled(msg.sender, _requestId);
    }
    
    // 복구 요청 상태 조회
    function getRecoveryStatus(bytes32 _requestId) external view returns (
        address user,
        uint256 timestamp,
        uint256 expiryTime,
        uint256 approvalCount,
        bool isCompleted,
        bool isCancelled
    ) {
        RecoveryRequest storage request = recoveryRequests[_requestId];
        return (
            request.user,
            request.timestamp,
            request.expiryTime,
            request.approvalCount,
            request.isCompleted,
            request.isCancelled
        );
    }
    
    // 보호자 승인/거부 상태 조회
    function getGuardianResponse(bytes32 _requestId, address _guardian) external view returns (
        bool hasApproved,
        bool hasRejected
    ) {
        RecoveryRequest storage request = recoveryRequests[_requestId];
        return (request.hasApproved[_guardian], request.hasRejected[_guardian]);
    }
    
    // 사용자의 보호자 목록 조회
    function getGuardians(address _user) external view returns (
        address[3] memory addresses,
        string[3] memory names,
        string[3] memory contacts,
        bool[3] memory isActive
    ) {
        for(uint i = 0; i < MAX_GUARDIANS; i++) {
            Guardian memory guardian = userGuardians[_user][i];
            addresses[i] = guardian.walletAddress;
            names[i] = guardian.name;
            contacts[i] = guardian.contact;
            isActive[i] = guardian.isActive;
        }
        return (addresses, names, contacts, isActive);
    }
    
    // 사용자의 활성 복구 요청 조회
    function getActiveRecoveryRequest(address _user) external view returns (bytes32) {
        return activeRecoveryRequest[_user];
    }
    
    // 보호자 설정 여부 확인
    function hasGuardians(address _user) external view returns (bool) {
        return guardianCount[_user] == MAX_GUARDIANS;
    }
    
    // 복구 가능 여부 확인
    function canCompleteRecovery(bytes32 _requestId) external view returns (bool) {
        RecoveryRequest storage request = recoveryRequests[_requestId];
        return (
            request.user != address(0) &&
            request.approvalCount >= REQUIRED_APPROVALS &&
            block.timestamp <= request.expiryTime &&
            !request.isCompleted &&
            !request.isCancelled
        );
    }
}


