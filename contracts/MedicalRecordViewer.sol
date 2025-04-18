//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMedicalRecordStorage{
    function records(address patient, uint index)external view returns(
        string memory diagnosis,
        bool treated,
        string memory date
    );
    function getRecordCount(address patient)external view returns(uint);
}
contract MedicalRecordViewer{
    IMedicalRecordStorage public recordContract;

    constructor(address _recordContract){
        recordContract = IMedicalRecordStorage(_recordContract);
    }

    function getRecord(address patient, uint index)external view returns(
        string memory diagnosis,
        bool treated,
        string memory date
    ){
        return recordContract.records(patient, index);
    }
    function getRecordCount(address patient)external view returns(uint){
        return recordContract.getRecordCount(patient);
    }
}