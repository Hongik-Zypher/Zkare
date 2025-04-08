//SPDX-License_Identifier: MIT
pragma solidity ^0.8.28;

contract MedicalRecordStorage{
    struct Record{
        string diagnosis;
        bool treated;
        string date;
    }
    mapping(address=>Record[])public records;
    event RecordRegistered(address indexed patient, string diagnosis, bool treated, string date);

    function registerRecord(string memory diagnosis, bool treated, string memory date) public {
        Record memory newRecord = Record({
            diagnosis: diagnosis,
            treated: treated,
            date: date
        });
        records[msg.sender].push(newRecord);
        emit RecordRegistered(msg.sender, diagnosis, treated, date);
    }
    function getRecordCount(address patient) public view returns (uint) {
    return records[patient].length;
}
}