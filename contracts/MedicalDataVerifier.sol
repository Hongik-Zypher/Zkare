// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Zkare.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[] memory input
    ) external returns (bool);
}

/**
 * @title MedicalDataVerifier
 * @dev 환자 승인 기반 의료 데이터 검증을 위한 컨트랙트
 * 모든 의료 데이터 유형(혈액형, 알레르기, 병력 등)에 대한 검증 담당
 */
contract MedicalDataVerifier {
    Zkare public zkareContract;
    
    // 검증 유형별 verifier 컨트랙트 주소
    mapping(string => address) public verifiers;
    
    // 환자별 의료 데이터 저장 (타입 => 값)
    // 예: 환자A의 "bloodType" => 1 (A형)
    mapping(address => mapping(string => uint)) private patientData;
    
    // 승인 요청 구조체
    struct VerificationRequest {
        address requester;      // 요청자 주소
        string verificationType; // 검증 유형 (bloodType, allergy 등)
        uint requestedValue;    // 요청자가 추측한 값
        bool isPending;         // 대기 중 여부
        bool isApproved;        // 승인 여부
    }
    
    // 환자별 승인 요청 목록
    mapping(address => VerificationRequest[]) public verificationRequests;
    
    // 환자별 요청 카운트 (요청 ID 용도)
    mapping(address => uint) private requestCounts;
    
    // 이벤트 정의
    event VerificationRequested(address indexed requester, address indexed patient, string verificationType, uint requestId);
    event VerificationApproved(address indexed patient, uint requestId, bool approved);
    event VerificationResult(address indexed requester, address indexed patient, string verificationType, bool isValid);
    event PatientDataRegistered(address indexed patient, string dataType);
    event VerifierUpdated(string verificationType, address verifierAddress);
    event BloodTypeRegistered(address indexed patient, uint bloodTypeCode);
    event BloodTypeVerified(address indexed requester, address indexed patient, bool isMatch);
    
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
    
    // 환자 또는 의사만 호출 가능
    modifier onlyPatientOrDoctor(address patient) {
        require(
            msg.sender == patient || zkareContract.isDoctor(msg.sender),
            "Only patient or doctor can call this function"
        );
        _;
    }
    
    /**
     * @dev 생성자
     * @param _zkareContract Zkare 컨트랙트 주소
     * @param _groth16Verifier Groth16Verifier 컨트랙트 주소
     */
    constructor(address _zkareContract, address _groth16Verifier) {
        zkareContract = Zkare(_zkareContract);
        admin = msg.sender;
        
        // 기본 혈액형 검증기 등록
        verifiers["bloodType"] = _groth16Verifier;
        emit VerifierUpdated("bloodType", _groth16Verifier);
    }
    
    /**
     * @dev 검증기 등록/업데이트
     * @param verificationType 검증 유형 (예: "bloodType")
     * @param verifierAddress 해당 유형의 Groth16Verifier 컨트랙트 주소
     */
    function setVerifier(string memory verificationType, address verifierAddress) external onlyAdmin {
        require(verifierAddress != address(0), "Invalid verifier address");
        verifiers[verificationType] = verifierAddress;
        emit VerifierUpdated(verificationType, verifierAddress);
    }
    
    /**
     * @dev 환자 의료 데이터 등록 (의사만 가능)
     * @param patient 환자 주소
     * @param dataType 데이터 유형 (예: "bloodType")
     * @param value 의료 데이터 값
     */
    function registerPatientData(
        address patient,
        string memory dataType,
        uint value
    ) external onlyDoctor {
        // 특정 데이터 유형별 값 검증
        if (keccak256(abi.encodePacked(dataType)) == keccak256(abi.encodePacked("bloodType"))) {
            require(value >= 1 && value <= 4, "Invalid blood type code");
            emit BloodTypeRegistered(patient, value);
        }
        
        patientData[patient][dataType] = value;
        emit PatientDataRegistered(patient, dataType);
    }
    
    /**
     * @dev 의료 데이터 검증 요청 (누구나 요청 가능)
     * @param patient 환자 주소
     * @param verificationType 검증 유형 (예: "bloodType")
     * @param guessedValue 추측하는 값 (예: 1=A형)
     * @return requestId 요청 ID
     */
    function requestVerification(
        address patient,
        string memory verificationType,
        uint guessedValue
    ) external returns (uint) {
        require(verifiers[verificationType] != address(0), "Verification type not supported");
        require(patientData[patient][verificationType] != 0, "Patient data not registered");
        
        uint requestId = requestCounts[patient];
        requestCounts[patient]++;
        
        verificationRequests[patient].push(VerificationRequest({
            requester: msg.sender,
            verificationType: verificationType,
            requestedValue: guessedValue,
            isPending: true,
            isApproved: false
        }));
        
        emit VerificationRequested(msg.sender, patient, verificationType, requestId);
        return requestId;
    }
    
    /**
     * @dev 환자 또는 의사가 검증 요청에 응답
     * @param requestId 요청 ID
     * @param approved 승인 여부
     */
    function respondToVerification(uint requestId, bool approved) external {
        require(requestId < verificationRequests[msg.sender].length, "Request ID not found");
        VerificationRequest storage request = verificationRequests[msg.sender][requestId];
        require(request.isPending, "Request already processed");
        
        request.isPending = false;
        request.isApproved = approved;
        
        emit VerificationApproved(msg.sender, requestId, approved);
    }
    
    /**
     * @dev 승인된 요청에 대한 ZK 증명 제출 및 검증
     * @param patient 환자 주소
     * @param requestId 요청 ID
     * @param a ZK 증명의 a 파라미터
     * @param b ZK 증명의 b 파라미터
     * @param c ZK 증명의 c 파라미터
     * @param input 공개 입력값 (요청값, 실제값)
     * @return 검증 결과
     */
    function submitProof(
        address patient,
        uint requestId,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[] memory input
    ) external returns (bool) {
        require(requestId < verificationRequests[patient].length, "Request ID not found");
        VerificationRequest memory request = verificationRequests[patient][requestId];
        
        require(!request.isPending, "Request still pending");
        require(request.isApproved, "Request was denied");
        require(msg.sender == request.requester, "Only requester can submit proof");
        
        string memory verificationType = request.verificationType;
        address verifierAddr = verifiers[verificationType];
        
        IGroth16Verifier verifier = IGroth16Verifier(verifierAddr);
        bool isValid = verifier.verifyProof(a, b, c, input);
        
        // 특정 데이터 유형별 이벤트 발생
        if (keccak256(abi.encodePacked(verificationType)) == keccak256(abi.encodePacked("bloodType"))) {
            emit BloodTypeVerified(msg.sender, patient, isValid);
        }
        
        emit VerificationResult(msg.sender, patient, verificationType, isValid);
        return isValid;
    }
    
    /**
     * @dev 간단한 혈액형 확인 (승인 없이 직접 yes/no 응답)
     * BloodTypeVerifier 호환성을 위해 유지
     * @param patient 환자 주소
     * @param guessedBloodType 추측하는 혈액형 코드
     * @return 일치 여부
     */
    function checkBloodType(address patient, uint guessedBloodType) external view returns (bool) {
        require(patientData[patient]["bloodType"] > 0, "Patient blood type not registered");
        return guessedBloodType == patientData[patient]["bloodType"];
    }
    
    /**
     * @dev 혈액형 검증 - ZK 증명 사용 (BloodTypeVerifier 호환성)
     * @param patient 환자 주소
     * @param guessedBloodType 추측하는 혈액형 코드
     * @param a ZK 증명의 a 파라미터
     * @param b ZK 증명의 b 파라미터
     * @param c ZK 증명의 c 파라미터
     * @return 검증 결과
     */
    function verifyBloodType(
        address patient,
        uint guessedBloodType,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c
    ) external returns (bool) {
        require(patientData[patient]["bloodType"] > 0, "Patient blood type not registered");
        
        // 공개 입력값: [guessedBloodType, 실제 혈액형]
        uint[] memory input = new uint[](2);
        input[0] = guessedBloodType;
        input[1] = patientData[patient]["bloodType"];
        
        // 영지식 증명 검증
        address verifierAddr = verifiers["bloodType"];
        require(verifierAddr != address(0), "Blood type verifier not registered");
        
        IGroth16Verifier verifier = IGroth16Verifier(verifierAddr);
        bool isValid = verifier.verifyProof(a, b, c, input);
        
        // 결과 이벤트 발생
        bool isMatch = isValid && (guessedBloodType == patientData[patient]["bloodType"]);
        emit BloodTypeVerified(msg.sender, patient, isMatch);
        
        return isMatch;
    }
    
    /**
     * @dev 환자 또는 의사가 환자 데이터 조회
     * @param patient 환자 주소
     * @param dataType 데이터 유형
     * @return 환자 데이터 값
     */
    function getPatientData(address patient, string memory dataType) 
        external 
        view 
        onlyPatientOrDoctor(patient) 
        returns (uint) 
    {
        return patientData[patient][dataType];
    }
    
    /**
     * @dev 환자의 대기 중인 요청 수 조회
     * @param patient 환자 주소
     * @return 대기 중인 요청 수
     */
    function getPendingRequestCount(address patient) external view returns (uint) {
        uint count = 0;
        for (uint i = 0; i < verificationRequests[patient].length; i++) {
            if (verificationRequests[patient][i].isPending) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev 환자의 특정 요청 상세 조회
     * @param patient 환자 주소
     * @param requestId 요청 ID
     * @return requester 요청자 주소
     * @return verificationType 검증 유형
     * @return requestedValue 요청값
     * @return isPending 대기 중 여부
     * @return isApproved 승인 여부
     */
    function getRequestDetails(address patient, uint requestId)
        external
        view
        returns (
            address requester,
            string memory verificationType,
            uint requestedValue,
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
            request.isPending,
            request.isApproved
        );
    }
} 