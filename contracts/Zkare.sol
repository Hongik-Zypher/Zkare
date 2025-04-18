// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Zkare
 * @dev 메인 컨트랙트로, 의료 기록 관리 및 접근 제어를 담당합니다.
 * MedicalRecordStorage의 기능을 통합하여 환자 의료 기록을 저장 및 관리합니다.
 */
contract Zkare {
    struct MedicalRecord {
        bytes32 recordHash;       // 진단결과 hash값(SHA-256)
        string cid;               // 암호화된 진단결과JSON의 CID
        address patient;          // 환자주소
        address doctor;           // 의사주소
        uint256 timestamp;        // 진료일시
        bool isDeleted;           // 삭제 여부
    }

    // 환자별 진료기록
    mapping(address => MedicalRecord[]) public records;
    
    // 의사인지 확인
    mapping(address => bool) public doctorStatus;
    
    // 환자인지 확인
    mapping(address => bool) public patientStatus;
    
    // 의사 목록 배열
    address[] public doctors;
    
    // 환자 목록 배열
    address[] public patients;
    
    // 관리자 주소
    address public admin;

    // 기록 접근 승인 관리 - 환자 => 요청자 => 승인 여부
    mapping(address => mapping(address => bool)) public accessApprovals;
    
    // 기록 조회 요청 구조체
    struct ViewRequest {
        address requester;  // 요청자 주소
        uint256 timestamp;  // 요청 시간
        bool isPending;     // 대기 중 여부
        bool isApproved;    // 승인 여부
    }
    
    // 환자별 조회 요청 목록
    mapping(address => ViewRequest[]) public viewRequests;
    
    // 이벤트 정의
    event RecordRegistered(address indexed patient, address indexed doctor, bytes32 recordHash);
    event RecordDeleted(address indexed patient, address indexed doctor, bytes32 recordHash);
    event ViewRequestCreated(address indexed requester, address indexed patient, uint requestId);
    event ViewRequestApproved(address indexed patient, address indexed requester, bool approved);
    event AccessGranted(address indexed patient, address indexed viewer);
    event AccessRevoked(address indexed patient, address indexed viewer);
    event DoctorAdded(address indexed doctor);
    event DoctorRemoved(address indexed doctor);
    event PatientRegistered(address indexed patient);
    
    // 의사만 호출 가능
    modifier onlyDoctor() {
        require(doctorStatus[msg.sender], "Only doctor can call this function");
        _;
    }
    
    // 관리자만 호출 가능
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    // 환자 또는 승인된 요청자만 호출 가능
    modifier onlyPatientOrApproved(address patient) {
        require(
            msg.sender == patient || accessApprovals[patient][msg.sender],
            "Not authorized to access patient records"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        // 배포자(관리자)를 의사로 등록
        _addDoctor(msg.sender); 
    }

    /**
     * @dev 의료 기록 등록 함수 (의사만 호출 가능)
     * @param recordHash 의료 기록 해시값
     * @param cid IPFS 상의 암호화된 기록 CID
     * @param patient 환자 주소
     */
    function registerRecord(bytes32 recordHash, string memory cid, address patient) public onlyDoctor {
        // 환자가 등록되어 있지 않다면 자동으로 등록
        if (!patientStatus[patient]) {
            _registerPatient(patient);
        }
        
        MedicalRecord memory newRecord = MedicalRecord({
            recordHash: recordHash,
            cid: cid,
            patient: patient,
            doctor: msg.sender,
            timestamp: block.timestamp,
            isDeleted: false
        });
        
        records[patient].push(newRecord);
        emit RecordRegistered(patient, msg.sender, recordHash);
    }

    /**
     * @dev 의료 기록 삭제 함수 (의사만 호출 가능)
     * @param patient 환자 주소
     * @param recordIndex 삭제할 기록 인덱스
     */
    function deleteRecord(address patient, uint recordIndex) public onlyDoctor {
        require(recordIndex < records[patient].length, "Record does not exist");
        require(!records[patient][recordIndex].isDeleted, "Record already deleted");
        
        // 실제로 삭제하지 않고 삭제 플래그만 설정
        records[patient][recordIndex].isDeleted = true;
        
        emit RecordDeleted(
            patient,
            records[patient][recordIndex].doctor,
            records[patient][recordIndex].recordHash
        );
    }

    /**
     * @dev 환자 기록 갯수 조회
     * @param patient 환자 주소
     * @return 의료 기록 갯수
     */
    function getRecordCount(address patient) public view returns (uint) {
        uint count = 0;
        for (uint i = 0; i < records[patient].length; i++) {
            if (!records[patient][i].isDeleted) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev 특정 환자의 의료 기록 조회 (환자 본인 또는 승인된 사람만)
     * @param patient 환자 주소
     * @param recordIndex 기록 인덱스
     * @return recordHash 의료 기록 해시
     * @return cid IPFS 상의 암호화된 기록 CID
     * @return doctor 담당 의사 주소
     * @return timestamp 기록 생성 시간
     */
    function getRecord(address patient, uint recordIndex) 
        public 
        view 
        onlyPatientOrApproved(patient) 
        returns (
            bytes32 recordHash,
            string memory cid,
            address doctor,
            uint256 timestamp
        ) 
    {
        require(recordIndex < records[patient].length, "Record does not exist");
        require(!records[patient][recordIndex].isDeleted, "Record has been deleted");
        
        MedicalRecord memory record = records[patient][recordIndex];
        return (
            record.recordHash,
            record.cid,
            record.doctor,
            record.timestamp
        );
    }

    /**
     * @dev 내부용 의사 추가 함수
     * @param doctor 의사 주소
     */
    function _addDoctor(address doctor) internal {
        if (!doctorStatus[doctor]) {
            doctorStatus[doctor] = true;
            doctors.push(doctor);
            emit DoctorAdded(doctor);
        }
    }

    /**
     * @dev 의사 추가 (관리자만 호출 가능)
     * @param doctor 의사 주소
     */
    function addDoctor(address doctor) public onlyAdmin {
        _addDoctor(doctor);
    }

    /**
     * @dev 의사 제거 (관리자만 호출 가능)
     * @param doctor 의사 주소
     */
    function removeDoctor(address doctor) public onlyAdmin {
        require(doctorStatus[doctor], "Address is not a doctor");
        doctorStatus[doctor] = false;
        
        // 의사 목록에서 제거 (실제 배열에서 제거하지는 않고 매핑 상태만 변경)
        emit DoctorRemoved(doctor);
    }

    /**
     * @dev 내부용 환자 등록 함수
     * @param patient 환자 주소
     */
    function _registerPatient(address patient) internal {
        if (!patientStatus[patient]) {
            patientStatus[patient] = true;
            patients.push(patient);
            emit PatientRegistered(patient);
        }
    }

    /**
     * @dev 환자 등록 (누구나 호출 가능)
     */
    function registerPatient() public {
        _registerPatient(msg.sender);
    }

    /**
     * @dev 조회 요청 생성 (누구나 요청 가능)
     * @param patient 환자 주소
     * @return requestId 요청 ID
     */
    function requestAccess(address patient) public returns (uint) {
        // 이미 승인된 경우 요청 불필요
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
     * @dev 조회 요청 응답 (환자만 가능)
     * @param requestId 요청 ID
     * @param approved 승인 여부
     */
    function respondToRequest(uint requestId, bool approved) public {
        require(requestId < viewRequests[msg.sender].length, "Request ID not found");
        ViewRequest storage request = viewRequests[msg.sender][requestId];
        
        require(request.isPending, "Request already processed");
        
        request.isPending = false;
        request.isApproved = approved;
        
        // 승인하는 경우 접근 권한 부여
        if (approved) {
            accessApprovals[msg.sender][request.requester] = true;
            emit AccessGranted(msg.sender, request.requester);
        }
        
        emit ViewRequestApproved(msg.sender, request.requester, approved);
    }

    /**
     * @dev 접근 권한 취소 (환자만 가능)
     * @param viewer 권한 취소할 조회자 주소
     */
    function revokeAccess(address viewer) public {
        require(accessApprovals[msg.sender][viewer], "Viewer does not have access");
        
        accessApprovals[msg.sender][viewer] = false;
        emit AccessRevoked(msg.sender, viewer);
    }

    /**
     * @dev 특정 환자의 모든 기록 조회 (환자 본인 또는 승인된 사람만)
     * @param patient 환자 주소
     * @return 활성 상태의 모든 의료 기록 인덱스 배열
     */
    function getAllRecords(address patient) 
        public 
        view 
        onlyPatientOrApproved(patient) 
        returns (uint[] memory) 
    {
        uint count = getRecordCount(patient);
        uint[] memory activeRecordIndices = new uint[](count);
        
        uint currentIndex = 0;
        for (uint i = 0; i < records[patient].length; i++) {
            if (!records[patient][i].isDeleted) {
                activeRecordIndices[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return activeRecordIndices;
    }

    /**
     * @dev 특정 의사의 모든 환자 기록 조회 (의사만 호출 가능)
     * @param doctor 의사 주소
     * @param patient 환자 주소
     * @return 해당 의사가 담당한 환자의 모든 의료 기록 인덱스 배열
     */
    function getDoctorPatientRecords(address doctor, address patient) 
        public 
        view 
        onlyDoctor 
        returns (uint[] memory) 
    {
        uint totalCount = 0;
        for (uint i = 0; i < records[patient].length; i++) {
            if (records[patient][i].doctor == doctor && !records[patient][i].isDeleted) {
                totalCount++;
            }
        }
        
        uint[] memory doctorRecordIndices = new uint[](totalCount);
        uint currentIndex = 0;
        
        for (uint i = 0; i < records[patient].length; i++) {
            if (records[patient][i].doctor == doctor && !records[patient][i].isDeleted) {
                doctorRecordIndices[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return doctorRecordIndices;
    }

    /**
     * @dev 대기 중인 조회 요청 조회 (환자만 가능)
     * @return 대기 중인 요청 ID 배열
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
     * @dev 특정 요청 상세 조회
     * @param patient 환자 주소
     * @param requestId 요청 ID
     * @return requester 요청자 주소
     * @return timestamp 요청 시간
     * @return isPending 대기 중 여부
     * @return isApproved 승인 여부
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
        // 환자 본인이거나 요청자만 조회 가능
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
     * @dev 등록된 모든 의사 주소 목록 조회
     * @return 활성 상태인 의사 주소 배열
     */
    function getAllDoctors() public view returns (address[] memory) {
        // 활성 상태의 의사 수 계산
        uint activeCount = 0;
        for (uint i = 0; i < doctors.length; i++) {
            if (doctorStatus[doctors[i]]) {
                activeCount++;
            }
        }
        
        // 활성 상태인 의사만 포함하는 배열 생성
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
     * @dev 등록된 모든 환자 주소 목록 조회
     * @return 환자 주소 배열
     */
    function getAllPatients() public view returns (address[] memory) {
        return patients;
    }
    
    /**
     * @dev 주소가 의사인지 확인하는 함수
     * @param doctor 확인할 의사 주소
     * @return 의사 여부 (true/false)
     */
    function isDoctor(address doctor) public view returns (bool) {
        return doctorStatus[doctor];
    }
    
    /**
     * @dev 주소가 환자인지 확인하는 함수
     * @param patient 확인할 환자 주소
     * @return 환자 여부 (true/false)
     */
    function isPatient(address patient) public view returns (bool) {
        return patientStatus[patient];
    }
}
