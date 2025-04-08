// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Zkare{
    struct MedicalRecord{
        bytes32 recordHash;       //진단결과 hash값(SHA-256)
        string cid;               //암호화된 진단결과JSON의 CID
        address patient;          //환자주소
        address doctor;           //의사주소
        uint256 timestamp;        //진료일시  
    }

    mapping(address=>MedicalRecord[]) public records;//환자별 진료기록

    mapping(address=>bool) public isDoctor;//의사인지 확인

    event RecordRegistered(address indexed petient, address indexed doctor, bytes32 recordHash);

    //테스트용 병원 등록
    constructor(){
        isDoctor[msg.sender] = true; //배포자= 병원
    }

function registerRecord(bytes32 recordHash, string memory cid, address patient)public{
    require(isDoctor[msg.sender],"Only doctor can register");

    MedicalRecord memory newRecord = MedicalRecord({
        recordHash: recordHash,
        cid: cid,
        patient: patient,
        doctor: msg.sender,
        timestamp: block.timestamp
});
records[patient].push(newRecord);
emit RecordRegistered(patient, msg.sender, recordHash);
}

function getRecordCount(address patient)public view returns(uint){
    return records[patient].length;
}
function addDoctor(address doctor)public{
    //의사 추가 함수. 접근 제한 통해 운영자만 추가 가능하도록 구현
    isDoctor[doctor] = true;
}

}
