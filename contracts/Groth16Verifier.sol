// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Groth16Verifier
 * @dev 표준화된 ZK 검증자 인터페이스
 * 모든 유형의 영지식 증명에 대해 일관된 인터페이스 제공
 */
contract Groth16Verifier {
    // 검증 시도 이벤트 정의
    event VerificationAttempt(
        uint[2] a,
        uint[2][2] b,
        uint[2] c,
        uint[] input
    );
    
    /**
     * @dev ZK 증명을 검증합니다
     * @param a Groth16 증명의 a 부분
     * @param b Groth16 증명의 b 부분
     * @param c Groth16 증명의 c 부분
     * @param input 공개 입력값 (가변 크기 배열로 변경)
     * @return 검증 성공 여부
     */
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[] memory input
    ) public returns (bool) {
        // 검증 시도를 기록
        emit VerificationAttempt(a, b, c, input);
        
        // 실제 검증자는 여기서 복잡한 ZK 증명 검증을 수행합니다
        // 테스트 목적으로 항상 true를 반환
        return true;
    }
    
    /**
     * @dev 고정 크기 input을 위한 오버로드 메서드들
     * 호환성을 위해 유지
     */
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[2] memory input
    ) public returns (bool) {
        uint[] memory dynamicInput = new uint[](2);
        dynamicInput[0] = input[0];
        dynamicInput[1] = input[1];
        return verifyProof(a, b, c, dynamicInput);
    }
    
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input
    ) public returns (bool) {
        uint[] memory dynamicInput = new uint[](4);
        dynamicInput[0] = input[0];
        dynamicInput[1] = input[1];
        dynamicInput[2] = input[2];
        dynamicInput[3] = input[3];
        return verifyProof(a, b, c, dynamicInput);
    }
} 