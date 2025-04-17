// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./MedicalRecordStorage.sol";
import "./Groth16Verifier.sol";

/**
 * @title Zkare
 * @dev Main contract responsible for medical record management and access control.
 * Provides basic functionality for patient and doctor management, medical record management, etc.
 */
contract Zkare {
    // Check if address is a doctor
    mapping(address => bool) public doctorStatus;
    
    // Check if address is a patient
    mapping(address => bool) public patientStatus;
    
    // Array of doctor addresses
    address[] public doctors;
    
    // Array of patient addresses
    address[] public patients;
    
    // Admin address
    address public admin;

    // Access approval management - patient => requester => approval status
    mapping(address => mapping(address => bool)) public accessApprovals;
    
    // View request structure
    struct ViewRequest {
        address requester;  // Requester address
        uint256 timestamp;  // Request time
        bool isPending;     // Pending status
        bool isApproved;    // Approval status
    }
    
    // View requests per patient
    mapping(address => ViewRequest[]) public viewRequests;
    
    // Verification request structure
    struct VerificationRequest {
        address requester;       // Requester address
        string verificationType; // Verification type (e.g., "bloodType")
        uint256 requestedValue;  // Requested value to verify
        uint256 timestamp;       // Request time
        bool isPending;          // Pending status
        bool isApproved;         // Approval status
    }
    
    // Verification requests per patient
    mapping(address => VerificationRequest[]) public verificationRequests;
    
    // Patient data mapping - patient => dataType => value
    mapping(address => mapping(string => uint256)) private patientData;
    
    // Medical record storage contract
    MedicalRecordStorage public recordStorage;
    
    // Groth16 verifier contract
    Groth16Verifier public verifierContract;
    
    // Event definitions
    event ViewRequestCreated(address indexed requester, address indexed patient, uint requestId);
    event ViewRequestApproved(address indexed patient, address indexed requester, bool approved);
    event AccessGranted(address indexed patient, address indexed viewer);
    event AccessRevoked(address indexed patient, address indexed viewer);
    event DoctorAdded(address indexed doctor);
    event DoctorRemoved(address indexed doctor);
    event PatientRegistered(address indexed patient);
    event MedicalRecordStorageDeployed(address indexed storageAddress);
    event VerificationRequested(address indexed requester, address indexed patient, uint requestId, string verificationType);
    event VerificationResponded(address indexed patient, uint requestId, bool approved);
    event PatientDataRegistered(address indexed patient, string dataType, uint256 value);
    
    // Only doctors can call
    modifier onlyDoctor() {
        require(doctorStatus[msg.sender], "Only doctor can call this function");
        _;
    }
    
    // Only admin can call
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    // Only patient or approved requester can call
    modifier onlyPatientOrApproved(address patient) {
        require(
            msg.sender == patient || accessApprovals[patient][msg.sender],
            "Not authorized to access patient records"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        // Register deployer (admin) as a doctor
        _addDoctor(msg.sender);
        
        // Deploy medical record storage contract
        recordStorage = new MedicalRecordStorage(address(this));
        emit MedicalRecordStorageDeployed(address(recordStorage));
    }

    /**
     * @dev Register medical record (only doctors can call)
     * @param recordHash Medical record hash value
     * @param cid Encrypted record CID on IPFS
     * @param patient Patient address
     */
    function registerRecord(bytes32 recordHash, string memory cid, address patient) public onlyDoctor {
        // Automatically register patient if not already registered
        if (!patientStatus[patient]) {
            _registerPatient(patient);
        }
        
        // Register record through MedicalRecordStorage contract
        string[] memory emptyTags = new string[](0);
        recordStorage.registerRecord(
            patient,
            "Medical Record", // recordType
            "Treatment History", // title
            "Treatment history registered by doctor", // description
            recordHash, // contentHash using existing hash value
            emptyTags // empty tags array
        );
    }

    /**
     * @dev Internal function to add doctor
     * @param doctor Doctor address
     */
    function _addDoctor(address doctor) internal {
        if (!doctorStatus[doctor]) {
            doctorStatus[doctor] = true;
            doctors.push(doctor);
            emit DoctorAdded(doctor);
        }
    }

    /**
     * @dev Add doctor (only admin can call)
     * @param doctor Doctor address
     */
    function addDoctor(address doctor) public onlyAdmin {
        _addDoctor(doctor);
    }

    /**
     * @dev Remove doctor (only admin can call)
     * @param doctor Doctor address
     */
    function removeDoctor(address doctor) public onlyAdmin {
        require(doctorStatus[doctor], "Address is not a doctor");
        doctorStatus[doctor] = false;
        
        // Remove from doctor list (only change mapping status, not actual array)
        emit DoctorRemoved(doctor);
    }

    /**
     * @dev Internal function to register patient
     * @param patient Patient address
     */
    function _registerPatient(address patient) internal {
        if (!patientStatus[patient]) {
            patientStatus[patient] = true;
            patients.push(patient);
            emit PatientRegistered(patient);
        }
    }

    /**
     * @dev Register patient (anyone can call)
     */
    function registerPatient() public {
        _registerPatient(msg.sender);
    }

    /**
     * @dev Create view request (anyone can request)
     * @param patient Patient address
     * @return requestId Request ID
     */
    function requestAccess(address patient) public returns (uint) {
        // No need to request if already approved
        if (accessApprovals[patient][msg.sender]) {
            return 0;
        }
        
        uint requestId = viewRequests[patient].length;
        
        viewRequests[patient].push(ViewRequest({
            requester: msg.sender,
            timestamp: block.timestamp,
            isPending: true,
            isApproved: false
        }));
        
        emit ViewRequestCreated(msg.sender, patient, requestId);
        return requestId;
    }

    /**
     * @dev Respond to view request (only patient can respond)
     * @param requestId Request ID
     * @param approved Approval status
     */
    function respondToRequest(uint requestId, bool approved) public {
        require(requestId < viewRequests[msg.sender].length, "Request ID not found");
        ViewRequest storage request = viewRequests[msg.sender][requestId];
        
        require(request.isPending, "Request already processed");
        
        request.isPending = false;
        request.isApproved = approved;
        
        // Grant access if approved
        if (approved) {
            accessApprovals[msg.sender][request.requester] = true;
            emit AccessGranted(msg.sender, request.requester);
        }
        
        emit ViewRequestApproved(msg.sender, request.requester, approved);
    }

    /**
     * @dev Revoke access (only patient can call)
     * @param viewer Viewer address to revoke access from
     */
    function revokeAccess(address viewer) public {
        require(accessApprovals[msg.sender][viewer], "Viewer does not have access");
        
        accessApprovals[msg.sender][viewer] = false;
        emit AccessRevoked(msg.sender, viewer);
    }

    /**
     * @dev Get pending view requests (only patient can call)
     * @return Array of pending request IDs
     */
    function getPendingRequests() public view returns (uint[] memory) {
        uint totalCount = 0;
        for (uint i = 0; i < viewRequests[msg.sender].length; i++) {
            if (viewRequests[msg.sender][i].isPending) {
                totalCount++;
            }
        }
        
        uint[] memory pendingRequestIds = new uint[](totalCount);
        uint currentIndex = 0;
        
        for (uint i = 0; i < viewRequests[msg.sender].length; i++) {
            if (viewRequests[msg.sender][i].isPending) {
                pendingRequestIds[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return pendingRequestIds;
    }

    /**
     * @dev Get specific request details
     * @param patient Patient address
     * @param requestId Request ID
     * @return requester Requester address
     * @return timestamp Request time
     * @return isPending Pending status
     * @return isApproved Approval status
     */
    function getRequestDetails(address patient, uint requestId) 
        public 
        view 
        returns (
            address requester,
            uint256 timestamp,
            bool isPending,
            bool isApproved
        ) 
    {
        require(requestId < viewRequests[patient].length, "Request ID not found");
        // Only patient or requester can view details
        require(
            msg.sender == patient || msg.sender == viewRequests[patient][requestId].requester,
            "Not authorized to view request details"
        );
        
        ViewRequest memory request = viewRequests[patient][requestId];
        
        return (
            request.requester,
            request.timestamp,
            request.isPending,
            request.isApproved
        );
    }

    /**
     * @dev Get all registered doctor addresses
     * @return Array of active doctor addresses
     */
    function getAllDoctors() public view returns (address[] memory) {
        // Count active doctors
        uint activeCount = 0;
        for (uint i = 0; i < doctors.length; i++) {
            if (doctorStatus[doctors[i]]) {
                activeCount++;
            }
        }
        
        // Create array with only active doctors
        address[] memory activeDoctors = new address[](activeCount);
        uint currentIndex = 0;
        
        for (uint i = 0; i < doctors.length; i++) {
            if (doctorStatus[doctors[i]]) {
                activeDoctors[currentIndex] = doctors[i];
                currentIndex++;
            }
        }
        
        return activeDoctors;
    }
    
    /**
     * @dev Get all registered patient addresses
     * @return Array of patient addresses
     */
    function getAllPatients() public view returns (address[] memory) {
        return patients;
    }
    
    /**
     * @dev Check if address is a doctor
     * @param doctor Address to check
     * @return Whether address is a doctor (true/false)
     */
    function isDoctor(address doctor) public view returns (bool) {
        return doctorStatus[doctor];
    }
    
    /**
     * @dev Check if address is a patient
     * @param patient Address to check
     * @return Whether address is a patient (true/false)
     */
    function isPatient(address patient) public view returns (bool) {
        return patientStatus[patient];
    }
    
    /**
     * @dev Get patient's medical record count (after permission check)
     * @param patient Patient address
     * @return Number of active medical records for patient
     */
    function getPatientRecordCount(address patient) public view onlyPatientOrApproved(patient) returns (uint256) {
        return recordStorage.getPatientRecordCount(patient);
    }
    
    /**
     * @dev Get patient's medical record count (admin and doctor only)
     * @param patient Patient address
     * @return Number of active medical records for patient
     */
    function getPatientRecordCountAdmin(address patient) public view returns (uint256) {
        require(doctorStatus[msg.sender] || msg.sender == admin, "Only doctor or admin can call");
        return recordStorage.getPatientRecordCount(patient);
    }
    
    /**
     * @dev Get specific medical record for patient (after permission check)
     * @param patient Patient address
     * @param recordId Record ID
     * @return id Record ID
     * @return recordType Type of medical record
     * @return title Record title
     * @return description Record description
     * @return timestamp Creation timestamp
     * @return doctor Doctor's address
     * @return hospital Hospital address
     * @return contentHash Content hash
     * @return metadata Record metadata
     * @return isActive Active status
     */
    function getPatientRecord(address patient, uint256 recordId) 
        public 
        view 
        onlyPatientOrApproved(patient) 
        returns (
            uint256 id,
            string memory recordType,
            string memory title,
            string memory description,
            uint256 timestamp,
            address doctor,
            string memory hospital,
            bytes32 contentHash,
            string memory metadata,
            bool isActive
        ) 
    {
        MedicalRecordStorage.MedicalRecord memory record = recordStorage.getPatientRecordById(patient, recordId);
        return (
            record.id,
            record.recordType,
            record.title,
            record.description,
            record.timestamp,
            record.doctor,
            addressToString(record.hospital), // Convert address to string
            record.contentHash,
            "", // metadata not available in MedicalRecord struct
            record.isActive
        );
    }
    
    // Helper function to convert address to string
    function addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint(uint8(value[i + 12] >> 4))];
            str[3+i*2] = alphabet[uint(uint8(value[i + 12] & 0x0f))];
        }
        return string(str);
    }

    /**
     * @dev Update patient's medical record (doctor permission check)
     * @param patient Patient address
     * @param recordId Record ID
     * @param title New title
     * @param description New description
     * @param contentHash New content hash
     * @param metadata New metadata
     */
    function updatePatientRecord(
        address patient,
        uint256 recordId,
        string memory title,
        string memory description,
        bytes32 contentHash,
        string memory metadata
    ) 
        public 
        onlyDoctor 
    {
        string[] memory emptyTags = new string[](0);
        recordStorage.updateRecord(
            patient,
            recordId,
            title,
            description,
            contentHash,
            emptyTags
        );
    }
    
    /**
     * @dev Get all medical records for patient (after permission check)
     * @param patient Patient address
     * @return Array of all active medical record IDs for patient
     */
    function getPatientRecords(address patient) 
        public 
        view 
        onlyPatientOrApproved(patient) 
        returns (uint256[] memory) 
    {
        return recordStorage.getPatientRecordIds(patient);
    }

    /**
     * @dev Set Groth16 verifier contract address (only admin can call)
     * @param _verifierContract Verifier contract address
     */
    function setVerifierContract(address _verifierContract) public onlyAdmin {
        verifierContract = Groth16Verifier(_verifierContract);
    }
    
    /**
     * @dev Request verification (anyone can request)
     * @param patient Patient address
     * @param verificationType Type of verification (e.g., "bloodType")
     * @param requestedValue Value to verify
     * @return requestId Request ID
     */
    function requestVerification(address patient, string calldata verificationType, uint256 requestedValue) public returns (uint) {
        uint requestId = verificationRequests[patient].length;
        
        verificationRequests[patient].push(VerificationRequest({
            requester: msg.sender,
            verificationType: verificationType,
            requestedValue: requestedValue,
            timestamp: block.timestamp,
            isPending: true,
            isApproved: false
        }));
        
        emit VerificationRequested(msg.sender, patient, requestId, verificationType);
        return requestId;
    }
    
    /**
     * @dev Respond to verification request (only patient can respond)
     * @param requestId Request ID
     * @param approved Approval status
     */
    function respondToVerification(uint requestId, bool approved) public {
        require(requestId < verificationRequests[msg.sender].length, "Request ID not found");
        VerificationRequest storage request = verificationRequests[msg.sender][requestId];
        
        require(request.isPending, "Request already processed");
        
        request.isPending = false;
        request.isApproved = approved;
        
        emit VerificationResponded(msg.sender, requestId, approved);
    }
    
    /**
     * @dev Get count of pending verification requests for patient
     * @param patient Patient address
     * @return Count of pending verification requests
     */
    function getPendingVerificationCount(address patient) public view returns (uint) {
        uint count = 0;
        
        for (uint i = 0; i < verificationRequests[patient].length; i++) {
            if (verificationRequests[patient][i].isPending) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * @dev Register patient data (only doctors can call)
     * @param patient Patient address
     * @param dataType Data type (e.g., "bloodType")
     * @param value Data value
     */
    function registerPatientData(address patient, string calldata dataType, uint256 value) public onlyDoctor {
        // Automatically register patient if not already registered
        if (!patientStatus[patient]) {
            _registerPatient(patient);
        }
        
        patientData[patient][dataType] = value;
        emit PatientDataRegistered(patient, dataType, value);
    }
    
    /**
     * @dev Get patient data (permission check)
     * @param patient Patient address
     * @param dataType Data type (e.g., "bloodType")
     * @return Data value
     */
    function getPatientData(address patient, string calldata dataType) public view onlyPatientOrApproved(patient) returns (uint256) {
        return patientData[patient][dataType];
    }

    /**
     * @dev Get details of specific verification request
     * @param patient Patient address
     * @param requestId Request ID
     * @return requester Requester address
     * @return verificationType Verification type (e.g., "bloodType")
     * @return requestedValue Requested value to verify
     * @return timestamp Request time
     * @return isPending Pending status
     * @return isApproved Approval status
     */
    function getVerificationRequestDetails(address patient, uint requestId)
        public
        view
        returns (
            address requester,
            string memory verificationType,
            uint256 requestedValue,
            uint256 timestamp,
            bool isPending,
            bool isApproved
        )
    {
        require(requestId < verificationRequests[patient].length, "Request ID not found");
        VerificationRequest memory request = verificationRequests[patient][requestId];
        
        return (
            request.requester,
            request.verificationType,
            request.requestedValue,
            request.timestamp,
            request.isPending,
            request.isApproved
        );
    }
}
