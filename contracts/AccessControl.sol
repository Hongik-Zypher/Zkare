// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MedicalRecord.sol";

contract AccessControl {
    MedicalRecord public medicalRecord;
    
    struct Access {
        address requester;      // 접근 요청자
        uint256 expiryTime;     // 접근 만료 시간
        bool isActive;          // 접근 권한 활성화 여부
    }
    
    // 환자 주소 => 기록 ID => 접근 권한
    mapping(address => mapping(uint256 => Access)) public accessPermissions;
    
    // 접근 요청 구조체
    struct AccessRequest {
        address patient;        // 환자 주소
        uint256 recordId;       // 기록 ID
        uint256 requestTime;    // 요청 시간
        bool isApproved;        // 승인 여부
    }
    
    // 요청자 주소 => 요청 ID => 접근 요청
    mapping(address => mapping(uint256 => AccessRequest)) public accessRequests;
    
    // 요청자 주소 => 요청 수
    mapping(address => uint256) public requestCount;
    
    // 이벤트
    event AccessRequested(address indexed requester, address indexed patient, uint256 indexed recordId);
    event AccessGranted(address indexed requester, address indexed patient, uint256 indexed recordId, uint256 expiryTime);
    event AccessRevoked(address indexed requester, address indexed patient, uint256 indexed recordId);
    
    constructor(address _medicalRecordAddress) {
        medicalRecord = MedicalRecord(_medicalRecordAddress);
    }
    
    // 접근 요청 생성
    function requestAccess(address _patient, uint256 _recordId) external {
        require(_recordId < medicalRecord.getRecordCount(_patient), "Record does not exist");
        
        uint256 requestId = requestCount[msg.sender];
        accessRequests[msg.sender][requestId] = AccessRequest({
            patient: _patient,
            recordId: _recordId,
            requestTime: block.timestamp,
            isApproved: false
        });
        requestCount[msg.sender]++;
        
        emit AccessRequested(msg.sender, _patient, _recordId);
    }
    
    // 접근 권한 부여
    function grantAccess(address _requester, uint256 _recordId, uint256 _durationInSeconds) external {
        require(_recordId < medicalRecord.getRecordCount(msg.sender), "Record does not exist");
        require(!accessPermissions[msg.sender][_recordId].isActive, "Access already granted");
        
        accessPermissions[msg.sender][_recordId] = Access({
            requester: _requester,
            expiryTime: block.timestamp + _durationInSeconds,
            isActive: true
        });
        
        emit AccessGranted(_requester, msg.sender, _recordId, block.timestamp + _durationInSeconds);
    }
    
    // 접근 권한 취소
    function revokeAccess(uint256 _recordId) external {
        require(accessPermissions[msg.sender][_recordId].isActive, "No active access");
        
        delete accessPermissions[msg.sender][_recordId];
        
        emit AccessRevoked(
            accessPermissions[msg.sender][_recordId].requester,
            msg.sender,
            _recordId
        );
    }
    
    // 접근 권한 확인
    function hasAccess(address _patient, uint256 _recordId) external view returns (bool) {
        Access memory access = accessPermissions[_patient][_recordId];
        return access.isActive && 
               access.requester == msg.sender && 
               block.timestamp <= access.expiryTime;
    }
    
    // 접근 요청 조회
    function getAccessRequest(uint256 _requestId) external view returns (
        address patient,
        uint256 recordId,
        uint256 requestTime,
        bool isApproved
    ) {
        require(_requestId < requestCount[msg.sender], "Request does not exist");
        AccessRequest memory request = accessRequests[msg.sender][_requestId];
        return (request.patient, request.recordId, request.requestTime, request.isApproved);
    }
    
    // 요청 수 조회
    function getRequestCount() external view returns (uint256) {
        return requestCount[msg.sender];
    }
} 