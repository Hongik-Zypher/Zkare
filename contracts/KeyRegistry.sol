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
    
    // 행안부 장관 주소 (constructor에서 설정)
    // 이 주소로 키를 등록하면 자동으로 마스터키로도 설정됨
    address public immutable MASTER_AUTHORITY_ADDRESS;
    
    // 행안부 장관 마스터키 관리
    struct MasterKey {
        string publicKey;      // RSA 공개키 (PEM 형식)
        uint256 timestamp;     // 등록/변경 시간
        bool isRegistered;     // 등록 여부
        address registeredBy;  // 등록한 주소 (Owner)
    }
    MasterKey private masterKey;
    
    // 이벤트들
    event PublicKeyRegistered(address indexed user, string publicKey);
    event PublicKeyUpdated(address indexed user, string newPublicKey);
    event DoctorCertified(address indexed doctor);
    event PatientRegistered(address indexed patient);
    event TrustedContractAdded(address indexed contractAddress);
    event TrustedContractRemoved(address indexed contractAddress);
    event MasterKeyRegistered(address indexed registeredBy, uint256 timestamp);
    event MasterKeyUpdated(address indexed updatedBy, uint256 timestamp);
    
    /**
     * @notice constructor에서 마스터 계정 주소 및 마스터키 설정
     * @param _masterAuthorityAddress 행안부 장관 주소 (환경 변수에서 읽어옴)
     * @param _masterPublicKey 행안부 장관의 RSA 공개키 (PEM 형식, 선택사항)
     *                         빈 문자열이면 행안부 장관이 나중에 registerPublicKey로 등록 가능
     */
    constructor(address _masterAuthorityAddress, string memory _masterPublicKey) Ownable(msg.sender) {
        require(_masterAuthorityAddress != address(0), "Master authority address cannot be zero");
        MASTER_AUTHORITY_ADDRESS = _masterAuthorityAddress;
        // 마스터키가 제공되면 설정, 없으면 나중에 행안부 장관이 등록할 수 있음
        if (bytes(_masterPublicKey).length > 0) {
            masterKey = MasterKey({
                publicKey: _masterPublicKey,
                timestamp: block.timestamp,
                isRegistered: true,
                registeredBy: msg.sender
            });
            
            emit MasterKeyRegistered(msg.sender, block.timestamp);
        }
    }
    
    // 공개키 등록
    function registerPublicKey(string memory _publicKey, bool _isDoctor) external {
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        require(!publicKeys[msg.sender].isRegistered, "Public key already registered");
        
        publicKeys[msg.sender] = PublicKey({
            key: _publicKey,
            timestamp: block.timestamp,
            isRegistered: true
        });
        
        // 행안부 장관이 키를 등록하면 마스터키로도 자동 설정
        // 이렇게 하면 행안부 장관이 일반 사용자처럼 키를 생성하고 등록하면
        // 자동으로 마스터키로도 설정되어 의료 기록 복호화에 사용 가능
        if (msg.sender == MASTER_AUTHORITY_ADDRESS) {
            masterKey = MasterKey({
                publicKey: _publicKey,
                timestamp: block.timestamp,
                isRegistered: true,
                registeredBy: msg.sender
            });
            emit MasterKeyRegistered(msg.sender, block.timestamp);
        }
        
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
    
    // 의사 여부 확인 (마스터 계정도 의사로 인식)
    function isDoctor(address _user) external view returns (bool) {
        // 마스터 계정은 항상 의사 권한
        if (_user == MASTER_AUTHORITY_ADDRESS) {
            return true;
        }
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
    
    // ============================================================================
    // 행안부 장관 마스터키 관리
    // ============================================================================
    
    /**
     * @notice 마스터키 설정 방법:
     *         1. constructor에서 frontend/.env의 REACT_APP_MASTER_PUBLIC_KEY로 설정 (선택사항)
     *         2. 행안부 장관(MASTER_AUTHORITY_ADDRESS)이 registerPublicKey로 키 등록 시 자동 설정
     * @notice 행안부 장관 주소는 MASTER_AUTHORITY_ADDRESS 상수로 고정
     */
    
    /**
     * 마스터키 조회
     * @return publicKey 마스터 공개키
     * @return timestamp 등록/변경 시간
     * @return isRegistered 등록 여부
     * @return registeredBy 등록한 주소
     */
    function getMasterKey() external view returns (
        string memory publicKey,
        uint256 timestamp,
        bool isRegistered,
        address registeredBy
    ) {
        return (
            masterKey.publicKey,
            masterKey.timestamp,
            masterKey.isRegistered,
            masterKey.registeredBy
        );
    }
    
    /**
     * 마스터키 등록 여부 확인
     */
    function isMasterKeyRegistered() external view returns (bool) {
        return masterKey.isRegistered;
    }
} 