// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract KeyRegistry is Ownable {
    
    struct PublicKey {
        string key;         // RSA 공개키 (PEM 형식)
        uint256 timestamp;  // 등록 시간
        bool isRegistered;  // 등록 여부
    }
    
    // 사용자 주소 => 공개키 정보
    mapping(address => PublicKey) private publicKeys;
    
    // 의사 주소 => 인증 여부
    mapping(address => bool) private doctors;
    
    // 환자 주소 => 등록 여부
    mapping(address => bool) private patients;
    
    // 신뢰할 수 있는 컨트랙트 (KeyRecovery 등)
    mapping(address => bool) private trustedContracts;
    
    // 이벤트들
    event PublicKeyRegistered(address indexed user, string publicKey);
    event PublicKeyUpdated(address indexed user, string newPublicKey);
    event DoctorCertified(address indexed doctor);
    event PatientRegistered(address indexed patient);
    event TrustedContractAdded(address indexed contractAddress);
    event TrustedContractRemoved(address indexed contractAddress);
    
    constructor() Ownable(msg.sender) {}
    
    // 공개키 등록
    function registerPublicKey(string memory _publicKey, bool _isDoctor) external {
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        require(!publicKeys[msg.sender].isRegistered, "Public key already registered");
        
        publicKeys[msg.sender] = PublicKey({
            key: _publicKey,
            timestamp: block.timestamp,
            isRegistered: true
        });
        
        if (_isDoctor) {
            doctors[msg.sender] = true;
            emit DoctorCertified(msg.sender);
        } else {
            patients[msg.sender] = true;
            emit PatientRegistered(msg.sender);
        }
        
        emit PublicKeyRegistered(msg.sender, _publicKey);
    }
    
    // 공개키 조회
    function getPublicKey(address _user) external view returns (string memory, uint256, bool) {
        PublicKey memory pubKey = publicKeys[_user];
        return (pubKey.key, pubKey.timestamp, pubKey.isRegistered);
    }
    
    // 공개키 등록 여부 확인
    function isPublicKeyRegistered(address _user) external view returns (bool) {
        return publicKeys[_user].isRegistered;
    }
    
    // 의사 여부 확인
    function isDoctor(address _user) external view returns (bool) {
        return doctors[_user];
    }
    
    // 환자 여부 확인
    function isPatient(address _user) external view returns (bool) {
        return patients[_user];
    }
    
    // 의사 인증 (관리자만 가능)
    function certifyDoctor(address _doctor) external onlyOwner {
        doctors[_doctor] = true;
        emit DoctorCertified(_doctor);
    }
    
    // 의사 인증 취소 (관리자만 가능)
    function revokeDoctorCertification(address _doctor) external onlyOwner {
        doctors[_doctor] = false;
    }
    
    // 공개키 업데이트 (본인만 가능)
    function updatePublicKey(string memory _newPublicKey) external {
        require(bytes(_newPublicKey).length > 0, "New public key cannot be empty");
        require(publicKeys[msg.sender].isRegistered, "User not registered");
        
        publicKeys[msg.sender].key = _newPublicKey;
        publicKeys[msg.sender].timestamp = block.timestamp;
        
        emit PublicKeyUpdated(msg.sender, _newPublicKey);
    }
    
    // 다른 사용자의 공개키 업데이트 (신뢰할 수 있는 컨트랙트만 가능 - 키 복구용)
    function updatePublicKeyFor(address _user, string memory _newPublicKey) external {
        require(trustedContracts[msg.sender], "Only trusted contracts can call this");
        require(bytes(_newPublicKey).length > 0, "New public key cannot be empty");
        require(publicKeys[_user].isRegistered, "User not registered");
        
        publicKeys[_user].key = _newPublicKey;
        publicKeys[_user].timestamp = block.timestamp;
        
        emit PublicKeyUpdated(_user, _newPublicKey);
    }
    
    // 신뢰할 수 있는 컨트랙트 추가 (관리자만 가능)
    function addTrustedContract(address _contract) external onlyOwner {
        require(_contract != address(0), "Invalid contract address");
        trustedContracts[_contract] = true;
        emit TrustedContractAdded(_contract);
    }
    
    // 신뢰할 수 있는 컨트랙트 제거 (관리자만 가능)
    function removeTrustedContract(address _contract) external onlyOwner {
        trustedContracts[_contract] = false;
        emit TrustedContractRemoved(_contract);
    }
    
    // 신뢰할 수 있는 컨트랙트 여부 확인
    function isTrustedContract(address _contract) external view returns (bool) {
        return trustedContracts[_contract];
    }
} 