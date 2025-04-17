// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Zkare.sol";

/**
 * @title MedicalRecordStorage
 * @dev 환자 의료 기록 저장 및 관리를 담당하는 컨트랙트
 * 의료 기록 저장 및 업데이트를 위한 기본 기능 제공
 */
contract MedicalRecordStorage {
    Zkare public zkareContract;
    
    // 이벤트 정의
    event RecordRegistered(address indexed patient, uint recordId, uint timestamp);
    event RecordUpdated(address indexed patient, uint recordId, uint timestamp);
    event RecordDeleted(address indexed patient, uint recordId, uint timestamp);
    
    // 의료 기록 구조체
    struct MedicalRecord {
        uint id;                  // 기록 ID
        string recordType;        // 기록 유형 (검진, 진단서, 처방전 등)
        string title;             // 제목
        string description;       // 설명
        uint timestamp;           // 생성 시간
        address doctor;           // 작성한 의사 주소
        address hospital;         // 병원 주소
        bytes32 contentHash;      // 내용 해시값
        string[] tags;            // 태그 목록
        bool isActive;            // 활성화 상태
    }
    
    // 환자별 의료 기록 목록
    mapping(address => MedicalRecord[]) private patientRecords;
    
    // 환자별 기록 카운트 (기록 ID 용도)
    mapping(address => uint) private recordCounts;
    
    // 병원 주소 목록
    address[] public hospitals;
    
    // 관리자 주소
    address public admin;
    
    // 관리자만 호출 가능
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    // 의사만 호출 가능
    modifier onlyDoctor() {
        require(zkareContract.isDoctor(msg.sender), "Only doctor can call this function");
        _;
    }
    
    // 병원만 호출 가능
    modifier onlyHospital() {
        bool isHospital = false;
        for (uint i = 0; i < hospitals.length; i++) {
            if (msg.sender == hospitals[i]) {
                isHospital = true;
                break;
            }
        }
        require(isHospital, "Only hospital can call this function");
        _;
    }
    
    /**
     * @dev 생성자
     * @param _zkareContract Zkare 컨트랙트 주소
     */
    constructor(address _zkareContract) {
        zkareContract = Zkare(_zkareContract);
        admin = msg.sender;
    }
    
    /**
     * @dev 병원 추가 (관리자만 가능)
     * @param hospital 병원 주소
     */
    function addHospital(address hospital) external onlyAdmin {
        for (uint i = 0; i < hospitals.length; i++) {
            if (hospitals[i] == hospital) {
                return; // 이미 존재하는 병원
            }
        }
        hospitals.push(hospital);
    }
    
    /**
     * @dev 병원 제거 (관리자만 가능)
     * @param hospital 병원 주소
     */
    function removeHospital(address hospital) external onlyAdmin {
        for (uint i = 0; i < hospitals.length; i++) {
            if (hospitals[i] == hospital) {
                hospitals[i] = hospitals[hospitals.length - 1];
                hospitals.pop();
                return;
            }
        }
    }
    
    /**
     * @dev 의료 기록 등록 (의사만 가능)
     * @param patient 환자 주소
     * @param recordType 기록 유형
     * @param title 제목
     * @param description 설명
     * @param contentHash 내용 해시값
     * @param tags 태그 목록
     * @return 생성된 기록 ID
     */
    function registerRecord(
        address patient,
        string memory recordType,
        string memory title,
        string memory description,
        bytes32 contentHash,
        string[] memory tags
    ) external onlyDoctor returns (uint) {
        uint recordId = recordCounts[patient];
        recordCounts[patient]++;
        
        patientRecords[patient].push(MedicalRecord({
            id: recordId,
            recordType: recordType,
            title: title,
            description: description,
            timestamp: block.timestamp,
            doctor: msg.sender,
            hospital: address(0), // 추후 병원 주소 설정 가능
            contentHash: contentHash,
            tags: tags,
            isActive: true
        }));
        
        emit RecordRegistered(patient, recordId, block.timestamp);
        return recordId;
    }
    
    /**
     * @dev 병원에서 의료 기록 등록 (병원만 가능)
     * @param patient 환자 주소
     * @param doctor 의사 주소
     * @param recordType 기록 유형
     * @param title 제목
     * @param description 설명
     * @param contentHash 내용 해시값
     * @param tags 태그 목록
     * @return 생성된 기록 ID
     */
    function registerRecordByHospital(
        address patient,
        address doctor,
        string memory recordType,
        string memory title,
        string memory description,
        bytes32 contentHash,
        string[] memory tags
    ) external onlyHospital returns (uint) {
        require(zkareContract.isDoctor(doctor), "Specified address is not a doctor");
        
        uint recordId = recordCounts[patient];
        recordCounts[patient]++;
        
        patientRecords[patient].push(MedicalRecord({
            id: recordId,
            recordType: recordType,
            title: title,
            description: description,
            timestamp: block.timestamp,
            doctor: doctor,
            hospital: msg.sender,
            contentHash: contentHash,
            tags: tags,
            isActive: true
        }));
        
        emit RecordRegistered(patient, recordId, block.timestamp);
        return recordId;
    }
    
    /**
     * @dev 의료 기록 업데이트 (의사만 가능)
     * @param patient 환자 주소
     * @param recordId 기록 ID
     * @param title 제목
     * @param description 설명
     * @param contentHash 내용 해시값
     * @param tags 태그 목록
     */
    function updateRecord(
        address patient,
        uint recordId,
        string memory title,
        string memory description,
        bytes32 contentHash,
        string[] memory tags
    ) external onlyDoctor {
        require(recordId < patientRecords[patient].length, "Record ID not found");
        MedicalRecord storage record = patientRecords[patient][recordId];
        require(record.doctor == msg.sender, "Only the doctor who created the record can update it");
        
        record.title = title;
        record.description = description;
        record.contentHash = contentHash;
        record.tags = tags;
        record.timestamp = block.timestamp; // 업데이트 시간 기록
        
        emit RecordUpdated(patient, recordId, block.timestamp);
    }
    
    /**
     * @dev 의료 기록 삭제 (의사만 가능)
     * @param patient 환자 주소
     * @param recordId 기록 ID
     */
    function deleteRecord(address patient, uint recordId) external onlyDoctor {
        require(recordId < patientRecords[patient].length, "Record ID not found");
        MedicalRecord storage record = patientRecords[patient][recordId];
        require(record.doctor == msg.sender, "Only the doctor who created the record can delete it");
        
        record.isActive = false;
        
        emit RecordDeleted(patient, recordId, block.timestamp);
    }
    
    /**
     * @dev 환자의 모든 의료 기록 수 조회
     * @param patient 환자 주소
     * @return 의료 기록 수
     */
    function getPatientRecordCount(address patient) external view returns (uint) {
        return patientRecords[patient].length;
    }
    
    /**
     * @dev 환자의 특정 의료 기록 조회
     * @param patient 환자 주소
     * @param recordId 기록 ID
     * @return 의료 기록 정보
     */
    function getPatientRecordById(address patient, uint recordId) external view returns (MedicalRecord memory) {
        require(recordId < patientRecords[patient].length, "Record ID not found");
        return patientRecords[patient][recordId];
    }
    
    /**
     * @dev 환자의 활성 상태 의료 기록 수 조회
     * @param patient 환자 주소
     * @return 활성 상태 의료 기록 수
     */
    function getActiveRecordCount(address patient) external view returns (uint) {
        uint count = 0;
        for (uint i = 0; i < patientRecords[patient].length; i++) {
            if (patientRecords[patient][i].isActive) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev 환자의 의료 기록 ID 목록 조회
     * @param patient 환자 주소
     * @return 의료 기록 ID 목록
     */
    function getPatientRecordIds(address patient) external view returns (uint[] memory) {
        uint[] memory ids = new uint[](patientRecords[patient].length);
        for (uint i = 0; i < patientRecords[patient].length; i++) {
            ids[i] = patientRecords[patient][i].id;
        }
        return ids;
    }
    
    /**
     * @dev 환자의 활성 상태 의료 기록 ID 목록 조회
     * @param patient 환자 주소
     * @return 활성 상태 의료 기록 ID 목록
     */
    function getActiveRecordIds(address patient) external view returns (uint[] memory) {
        uint activeCount = 0;
        for (uint i = 0; i < patientRecords[patient].length; i++) {
            if (patientRecords[patient][i].isActive) {
                activeCount++;
            }
        }
        
        uint[] memory ids = new uint[](activeCount);
        uint index = 0;
        for (uint i = 0; i < patientRecords[patient].length; i++) {
            if (patientRecords[patient][i].isActive) {
                ids[index] = patientRecords[patient][i].id;
                index++;
            }
        }
        return ids;
    }
    
    /**
     * @dev 병원 목록 조회
     * @return 병원 주소 목록
     */
    function getHospitals() external view returns (address[] memory) {
        return hospitals;
}
}