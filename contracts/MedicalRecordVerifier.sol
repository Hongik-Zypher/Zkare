// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Zkare.sol";
import "./MedicalRecordStorage.sol";

/**
 * @title MedicalRecordVerifier
 * @dev Contract responsible for verifying patient medical records
 * Provides access control and verification functionality for patient medical records
 */
contract MedicalRecordVerifier {
    Zkare public zkareContract;
    MedicalRecordStorage public recordStorage;
    
    // Event definitions
    event AccessRequestCreated(address indexed requester, address indexed patient, uint requestId);
    event AccessRequestResolved(address indexed patient, uint requestId, bool approved);
    event RecordVerified(address indexed requester, address indexed patient, uint recordId, bool isValid);
    
    // Access request structure
    struct AccessRequest {
        address requester;      // Requester address
        uint[] recordIds;       // Requested record IDs
        bool isPending;         // Pending status
        bool isApproved;        // Approval status
    }
    
    // Access requests per patient
    mapping(address => AccessRequest[]) public accessRequests;
    
    // Request count per patient (for request ID)
    mapping(address => uint) private requestCounts;
    
    // Admin address
    address public admin;
    
    // Only admin can call
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    // Only patient can call
    modifier onlyPatient(address patient) {
        require(msg.sender == patient, "Only patient can call this function");
        _;
    }
    
    // Only doctor can call
    modifier onlyDoctor() {
        require(zkareContract.isDoctor(msg.sender), "Only doctor can call this function");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _zkareContract Zkare contract address
     * @param _recordStorage MedicalRecordStorage contract address
     */
    constructor(address _zkareContract, address _recordStorage) {
        zkareContract = Zkare(_zkareContract);
        recordStorage = MedicalRecordStorage(_recordStorage);
        admin = msg.sender;
    }
    
    /**
     * @dev Request access to medical records (only doctors can call)
     * @param patient Patient address
     * @param recordIds Array of requested record IDs
     * @return requestId Request ID
     */
    function requestAccess(address patient, uint[] memory recordIds) external onlyDoctor returns (uint) {
        uint requestId = requestCounts[patient];
        requestCounts[patient]++;
        
        accessRequests[patient].push(AccessRequest({
            requester: msg.sender,
            recordIds: recordIds,
            isPending: true,
            isApproved: false
        }));
        
        emit AccessRequestCreated(msg.sender, patient, requestId);
        return requestId;
    }
    
    /**
     * @dev Patient responds to access request
     * @param requestId Request ID
     * @param approved Approval status
     */
    function respondToAccessRequest(uint requestId, bool approved) external {
        require(requestId < accessRequests[msg.sender].length, "Request ID not found");
        AccessRequest storage request = accessRequests[msg.sender][requestId];
        require(request.isPending, "Request already processed");
        
        request.isPending = false;
        request.isApproved = approved;
        
        emit AccessRequestResolved(msg.sender, requestId, approved);
    }
    
    /**
     * @dev Verify medical record content
     * @param patient Patient address
     * @param recordId Record ID
     * @param hashToVerify Hash to verify
     * @return Verification result
     */
    function verifyRecordHash(address patient, uint recordId, bytes32 hashToVerify) external returns (bool) {
        // Get record from MedicalRecordStorage contract
        MedicalRecordStorage.MedicalRecord memory record = recordStorage.getPatientRecordById(patient, recordId);
        
        // Verify if content hash matches
        bool isValid = record.contentHash == hashToVerify;
        
        emit RecordVerified(msg.sender, patient, recordId, isValid);
        return isValid;
    }
    
    /**
     * @dev Check if access request is approved
     * @param patient Patient address
     * @param requestId Request ID
     * @return isApproved Approval status
     */
    function isAccessApproved(address patient, uint requestId) external view returns (bool) {
        require(requestId < accessRequests[patient].length, "Request ID not found");
        return accessRequests[patient][requestId].isApproved && !accessRequests[patient][requestId].isPending;
    }
    
    /**
     * @dev Check if requester has approved access to specific record
     * @param patient Patient address
     * @param recordId Record ID
     * @return Approval status
     */
    function canAccessRecord(address patient, uint recordId) external view returns (bool) {
        // Patient always has access to their own records
        if (msg.sender == patient) {
            return true;
        }
        
        // For doctors, check if there's an approved request
        if (zkareContract.isDoctor(msg.sender)) {
            for (uint i = 0; i < accessRequests[patient].length; i++) {
                AccessRequest memory request = accessRequests[patient][i];
                if (request.requester == msg.sender && !request.isPending && request.isApproved) {
                    // Check if record ID is in requested IDs
                    for (uint j = 0; j < request.recordIds.length; j++) {
                        if (request.recordIds[j] == recordId) {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * @dev Get count of pending access requests for patient
     * @param patient Patient address
     * @return Count of pending requests
     */
    function getPendingAccessRequestCount(address patient) external view returns (uint) {
        uint count = 0;
        for (uint i = 0; i < accessRequests[patient].length; i++) {
            if (accessRequests[patient][i].isPending) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev Get details of specific access request
     * @param patient Patient address
     * @param requestId Request ID
     * @return requester Requester address
     * @return recordIds Array of requested record IDs
     * @return isPending Pending status
     * @return isApproved Approval status
     */
    function getAccessRequestDetails(address patient, uint requestId)
        external
        view
        returns (
            address requester,
            uint[] memory recordIds,
            bool isPending,
            bool isApproved
        )
    {
        require(requestId < accessRequests[patient].length, "Request ID not found");
        AccessRequest memory request = accessRequests[patient][requestId];
        
        return (
            request.requester,
            request.recordIds,
            request.isPending,
            request.isApproved
        );
    }
} 