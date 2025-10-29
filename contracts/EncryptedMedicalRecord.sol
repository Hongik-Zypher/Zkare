// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./KeyRegistry.sol";

contract EncryptedMedicalRecord is Ownable {
    
    KeyRegistry public keyRegistry;
    
    struct PatientInfo {
        string name;
        string ipfsCid;           // IPFS Content Identifier (암호화된 기본정보 위치)
        string dataHash;          // 암호화된 데이터의 SHA-256 해시 (무결성 검증용)
        string encryptedDoctorKey;  // 의사 공개키로 암호화된 대칭키
        string encryptedPatientKey; // 환자 공개키로 암호화된 대칭키
        uint256 timestamp;
        bool isRegistered;
    }
    
    struct MedicalRecord {
        string ipfsCid;            // IPFS Content Identifier (암호화된 진료기록 위치)
        string dataHash;           // 암호화된 데이터의 SHA-256 해시 (무결성 검증용)
        string encryptedDoctorKey;  // 의사 공개키로 암호화된 대칭키
        string encryptedPatientKey; // 환자 공개키로 암호화된 대칭키
        address doctor;             // 진료한 의사 주소
        uint256 timestamp;          // 기록 생성 시간
    }
    
    // 환자 주소 => 환자 기본정보
    mapping(address => PatientInfo) private patientInfo;
    
    // 환자 주소 => 기록 ID => 진료기록
    mapping(address => mapping(uint256 => MedicalRecord)) private medicalRecords;
    
    // 환자별 기록 수
    mapping(address => uint256) private recordCounts;
    
    // 이벤트들
    event PatientRegistered(address indexed patient, string name);
    event MedicalRecordAdded(address indexed patient, address indexed doctor, uint256 indexed recordId);
    
    constructor(address _keyRegistryAddress) Ownable(msg.sender) {
        keyRegistry = KeyRegistry(_keyRegistryAddress);
    }
    
    // 환자 기본정보 등록 (처음 등록하는 환자)
    function registerPatient(
        address _patient,
        string memory _name,
        string memory _ipfsCid,
        string memory _dataHash,
        string memory _encryptedDoctorKey,
        string memory _encryptedPatientKey
    ) external {
        require(keyRegistry.isDoctor(msg.sender), "Only doctors can register patients");
        require(keyRegistry.isPublicKeyRegistered(_patient), "Patient public key not registered");
        require(!patientInfo[_patient].isRegistered, "Patient already registered");
        
        patientInfo[_patient] = PatientInfo({
            name: _name,
            ipfsCid: _ipfsCid,
            dataHash: _dataHash,
            encryptedDoctorKey: _encryptedDoctorKey,
            encryptedPatientKey: _encryptedPatientKey,
            timestamp: block.timestamp,
            isRegistered: true
        });
        
        emit PatientRegistered(_patient, _name);
    }
    
    // 진료기록 추가
    function addMedicalRecord(
        address _patient,
        string memory _ipfsCid,
        string memory _dataHash,
        string memory _encryptedDoctorKey,
        string memory _encryptedPatientKey
    ) external {
        require(keyRegistry.isDoctor(msg.sender), "Only doctors can add medical records");
        require(keyRegistry.isPublicKeyRegistered(_patient), "Patient public key not registered");
        require(patientInfo[_patient].isRegistered, "Patient not registered");
        
        uint256 recordId = recordCounts[_patient];
        medicalRecords[_patient][recordId] = MedicalRecord({
            ipfsCid: _ipfsCid,
            dataHash: _dataHash,
            encryptedDoctorKey: _encryptedDoctorKey,
            encryptedPatientKey: _encryptedPatientKey,
            doctor: msg.sender,
            timestamp: block.timestamp
        });
        
        recordCounts[_patient]++;
        
        emit MedicalRecordAdded(_patient, msg.sender, recordId);
    }
    
    // 환자 기본정보 조회
    function getPatientInfo(address _patient) external view returns (
        string memory name,
        string memory ipfsCid,
        string memory dataHash,
        string memory encryptedDoctorKey,
        string memory encryptedPatientKey,
        uint256 timestamp,
        bool isRegistered
    ) {
        require(
            msg.sender == _patient || keyRegistry.isDoctor(msg.sender),
            "Only patient or doctor can view patient info"
        );
        
        PatientInfo memory info = patientInfo[_patient];
        return (
            info.name,
            info.ipfsCid,
            info.dataHash,
            info.encryptedDoctorKey,
            info.encryptedPatientKey,
            info.timestamp,
            info.isRegistered
        );
    }
    
    // 진료기록 조회
    function getMedicalRecord(address _patient, uint256 _recordId) external view returns (
        string memory ipfsCid,
        string memory dataHash,
        string memory encryptedDoctorKey,
        string memory encryptedPatientKey,
        address doctor,
        uint256 timestamp
    ) {
        require(
            msg.sender == _patient || keyRegistry.isDoctor(msg.sender),
            "Only patient or doctor can view medical record"
        );
        require(_recordId < recordCounts[_patient], "Record does not exist");
        
        MedicalRecord memory record = medicalRecords[_patient][_recordId];
        return (
            record.ipfsCid,
            record.dataHash,
            record.encryptedDoctorKey,
            record.encryptedPatientKey,
            record.doctor,
            record.timestamp
        );
    }
    
    // 환자 등록 여부 확인
    function isPatientRegistered(address _patient) external view returns (bool) {
        return patientInfo[_patient].isRegistered;
    }
    
    // 환자의 기록 수 조회
    function getRecordCount(address _patient) external view returns (uint256) {
        return recordCounts[_patient];
    }
    
    // 환자 공개키 등록 여부 확인
    function isPatientPublicKeyRegistered(address _patient) external view returns (bool) {
        return keyRegistry.isPublicKeyRegistered(_patient);
    }
} 