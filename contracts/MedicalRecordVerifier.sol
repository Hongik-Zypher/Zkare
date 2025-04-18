// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Zkare.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[] memory input
    ) external returns (bool);
}

/**
 * @title MedicalRecordVerifier
 * @dev 의료 기록 접근 및 영지식 증명 검증을 위한 컨트랙트
 */
contract MedicalRecordVerifier {
    Zkare public zkareContract;
    IGroth16Verifier public verifierContract;
    
    // 접근 요청 구조체
    struct AccessRequest {
        address requester;       // 요청자 주소
        bytes32 recordHash;      // 요청된 레코드 해시
        uint256 requestTime;     // 요청 시간
        bool pendingApproval;    // 승인 대기 상태
        bool approved;           // 승인 여부
        uint256 approvalTime;    // 승인 시간
    }
    
    // 환자별 접근 요청 매핑
    mapping(address => mapping(bytes32 => AccessRequest)) public accessRequests;
    
    // 접근 요청 ID 추적
    mapping(bytes32 => bool) public requestExists;
    
    // nullifier 해시의 사용 여부를 추적
    mapping(uint256 => bool) public nullifierUsed;
    
    // 이벤트 정의
    event AccessRequested(address indexed requester, address indexed patient, bytes32 recordHash, bytes32 requestId);
    event AccessApproved(address indexed patient, bytes32 requestId, uint256 approvalTime);
    event AccessDenied(address indexed patient, bytes32 requestId);
    event ProofVerified(address indexed requester, bytes32 recordHash, uint256 nullifierHash, bool isApproved);
    
    constructor(address _zkareContract, address _verifierContract) {
        zkareContract = Zkare(_zkareContract);
        verifierContract = IGroth16Verifier(_verifierContract);
    }
    
    /**
     * @dev 의료 기록 접근 요청
     * @param patient 환자 주소
     * @param recordHash 요청할 의료 기록 해시
     * @return requestId 생성된 요청 ID
     */
    function requestAccess(address patient, bytes32 recordHash) public returns (bytes32) {
        // 요청 ID 생성
        bytes32 requestId = keccak256(abi.encodePacked(
            msg.sender, patient, recordHash, block.timestamp
        ));
        
        require(!requestExists[requestId], "Already exists request");
        
        // 요청 정보 저장
        accessRequests[patient][requestId] = AccessRequest({
            requester: msg.sender,
            recordHash: recordHash,
            requestTime: block.timestamp,
            pendingApproval: true,
            approved: false,
            approvalTime: 0
        });
        
        requestExists[requestId] = true;
        
        emit AccessRequested(msg.sender, patient, recordHash, requestId);
        
        return requestId;
    }
    
    /**
     * @dev 환자가 접근 요청 승인
     * @param requestId 요청 ID
     */
    function approveAccess(bytes32 requestId) public {
        AccessRequest storage request = accessRequests[msg.sender][requestId];
        
        require(request.pendingApproval, "Invalid request");
        
        request.pendingApproval = false;
        request.approved = true;
        request.approvalTime = block.timestamp;
        
        emit AccessApproved(msg.sender, requestId, block.timestamp);
    }
    
    /**
     * @dev 환자가 접근 요청 거부
     * @param requestId 요청 ID
     */
    function denyAccess(bytes32 requestId) public {
        AccessRequest storage request = accessRequests[msg.sender][requestId];
        
        require(request.pendingApproval, "Invalid request");
        
        request.pendingApproval = false;
        request.approved = false;
        
        emit AccessDenied(msg.sender, requestId);
    }
    
    /**
     * @dev ZK 증명을 검증합니다.
     * @param a Groth16 증명의 a 부분
     * @param b Groth16 증명의 b 부분
     * @param c Groth16 증명의 c 부분
     * @param recordHash 의료 기록 해시 (2개 요소)
     * @param approvalTimestamp 승인 시간
     * @param isApproved 승인 여부
     * @param nullifierHash nullifier 해시
     * @return 검증 성공 여부
     */
    function verifyMedicalRecordProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[2] memory recordHash,
        uint256 approvalTimestamp,
        uint256 isApproved,
        uint256 nullifierHash
    ) public returns (bool) {
        // nullifier가 이미 사용되었는지 확인
        require(!nullifierUsed[nullifierHash], "Already used nullifier");
        
        // 공개 입력값 설정 - 가변 배열로 변환
        uint[] memory input = new uint[](4);
        input[0] = recordHash[0];
        input[1] = recordHash[1];
        input[2] = approvalTimestamp;
        input[3] = isApproved;
        
        // ZK 증명 검증
        bool isValid = verifierContract.verifyProof(a, b, c, input);
        
        if (isValid) {
            // nullifier 사용 표시
            nullifierUsed[nullifierHash] = true;
            
            // 검증 성공 이벤트 발생
            bytes32 hashedRecord = bytes32(abi.encodePacked(recordHash[0], recordHash[1]));
            emit ProofVerified(msg.sender, hashedRecord, nullifierHash, isApproved == 1);
        }
        
        return isValid;
    }
    
    /**
     * @dev 환자의 승인 상태 조회
     * @param patient 환자 주소
     * @param requestId 요청 ID
     * @return 승인 상태 (true: 승인됨, false: 승인되지 않음)
     */
    function getApprovalStatus(address patient, bytes32 requestId) public view returns (bool, uint256) {
        AccessRequest storage request = accessRequests[patient][requestId];
        return (request.approved, request.approvalTime);
    }
    
    /**
     * @dev nullifier가 사용되었는지 확인
     * @param nullifierHash 확인할 nullifier 해시
     * @return 사용 여부
     */
    function isNullifierUsed(uint256 nullifierHash) public view returns (bool) {
        return nullifierUsed[nullifierHash];
    }
} 