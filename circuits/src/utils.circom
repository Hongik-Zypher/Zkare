pragma circom 2.0.0;

// 필요한 circomlib 컴포넌트 추가
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

/**
 * 문자열 해시를 바이트로 변환하는 유틸리티 함수
 * Solidity에서 나온 bytes32 해시값을 Circom 호환 형식으로 변환
 */
template Bytes32ToBits() {
    signal input bytes32Value[32];
    signal output bits[256];
    
    for (var i = 0; i < 32; i++) {
        for (var j = 0; j < 8; j++) {
            bits[i*8 + j] <-- (bytes32Value[i] >> j) & 1;
            bits[i*8 + j] * (bits[i*8 + j] - 1) === 0; // 0 또는 1만 허용
        }
    }
}

/**
 * 타임스탬프 검증 템플릿
 * 주어진 타임스탬프가 특정 범위 내에 있는지 확인
 */
template TimestampVerifier() {
    signal input timestamp;
    signal input minTimestamp;
    signal input maxTimestamp;
    signal output isValid;
    
    // 타임스탬프가 minTimestamp 이상인지 검증
    component gtMin = GreaterEqThan(64);
    gtMin.in[0] <== timestamp;
    gtMin.in[1] <== minTimestamp;
    
    // 타임스탬프가 maxTimestamp 이하인지 검증
    component ltMax = LessEqThan(64);
    ltMax.in[0] <== timestamp;
    ltMax.in[1] <== maxTimestamp;
    
    // 두 조건을 모두 만족하는지 검증
    isValid <== gtMin.out * ltMax.out;
}

/**
 * 주소 소유권 증명 템플릿
 * 사용자가 특정 이더리움 주소의 소유자임을 증명
 */
template AddressOwnershipProof() {
    signal input address;
    signal input privateKey;
    signal output isValid;
    
    // 실제 구현에서는 ECDSA 서명 검증 등 복잡한 로직이 필요
    // 이 예제에서는 단순화된 버전으로 구현
    component addressHasher = Poseidon(1);
    addressHasher.inputs[0] <== privateKey;
    
    // 주소와 해시값 비교 (실제로는 더 복잡한 절차 필요)
    // 이 부분은 교육 목적으로만 사용하고 실제 구현시 더 안전한 방법 필요
    isValid <-- address == addressHasher.out ? 1 : 0;
    isValid * (isValid - 1) === 0; // 0 또는 1만 허용
}

/**
 * 두 값이 동일한지 확인하는 템플릿
 */
template IsEqual() {
    signal input in[2];
    signal output out;
    
    // 두 값의 차이 계산
    signal diff <== in[0] - in[1];
    
    // 차이가 0인지 확인 (같으면 1, 다르면 0)
    signal isZero <-- diff == 0 ? 1 : 0;
    isZero * (isZero - 1) === 0; // 0 또는 1만 허용
    
    // diff * (1 - isZero) === 0; // diff가 0이 아니면 isZero는 0이어야 함
    
    // 결과 출력
    out <== isZero;
}

// IsInRange 템플릿 추가
template IsInRange(min, max) {
    signal input in;
    signal output out;

    // in이 [min, max] 범위 내에 있는지 확인
    // min <= in <= max
    
    // min <= in 검사
    signal minCheck <-- in >= min;
    
    // in <= max 검사
    signal maxCheck <-- in <= max;
    
    // 두 조건 모두 true인지 확인
    out <== minCheck * maxCheck;
} 