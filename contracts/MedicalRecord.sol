// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract MedicalRecord is Ownable {
    using ECDSA for bytes32;

    struct Record {
        string data;          // 의료 기록 데이터
        bytes signature;      // 병원의 서명
        address hospital;     // 병원 주소
        uint256 timestamp;    // 기록 생성 시간
    }

    // 환자 주소 => 기록 ID => 기록
    mapping(address => mapping(uint256 => Record)) private records;
    // 환자별 기록 수
    mapping(address => uint256) private recordCounts;
    // 의사 주소 => 권한 여부
    mapping(address => bool) private doctors;

    event RecordAdded(address indexed patient, uint256 indexed recordId, string data);
    event DoctorAdded(address indexed doctor);
    event DoctorRemoved(address indexed doctor);

    constructor() Ownable(msg.sender) {}

    // 의사 추가
    function addDoctor(address doctor) external onlyOwner {
        doctors[doctor] = true;
        emit DoctorAdded(doctor);
    }

    // 의사 제거
    function removeDoctor(address doctor) external onlyOwner {
        doctors[doctor] = false;
        emit DoctorRemoved(doctor);
    }

    // 의사 여부 확인
    function isDoctor(address doctor) external view returns (bool) {
        return doctors[doctor];
    }

    // 서명 검증
    function verifySignature(
        string memory data,
        bytes memory signature,
        address hospital
    ) public pure returns (bool) {
        bytes32 messageHash = MessageHashUtils.toEthSignedMessageHash(bytes(data));
        address signer = ECDSA.recover(messageHash, signature);
        return signer == hospital;
    }

    // 의료 기록 추가
    function addMedicalRecord(
        address patient,
        string memory data,
        bytes memory signature,
        address hospital
    ) external {
        require(doctors[msg.sender], "Only doctors can add records");
        require(verifySignature(data, signature, hospital), "Invalid signature");

        uint256 recordId = recordCounts[patient];
        records[patient][recordId] = Record({
            data: data,
            signature: signature,
            hospital: hospital,
            timestamp: block.timestamp
        });
        recordCounts[patient]++;

        emit RecordAdded(patient, recordId, data);
    }

    // 의료 기록 조회
    function getMedicalRecord(address patient, uint256 recordId)
        external
        view
        returns (
            string memory data,
            bytes memory signature,
            address hospital,
            uint256 timestamp
        )
    {
        require(
            msg.sender == patient || doctors[msg.sender],
            "Only the patient or a doctor can view this record"
        );
        Record memory record = records[patient][recordId];
        return (record.data, record.signature, record.hospital, record.timestamp);
    }

    // 환자의 기록 수 조회
    function getRecordCount(address patient) external view returns (uint256) {
        return recordCounts[patient];
    }
} 