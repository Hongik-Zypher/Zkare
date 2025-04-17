pragma circom 2.0.0;

// circomlib 직접 포함
include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";

// IsInRange 템플릿 정의
template IsInRange(n) {
    signal input in;
    signal input lowerBound;
    signal input upperBound;
    signal output out;

    component geq = GreaterEqThan(n);
    component leq = LessEqThan(n);
    
    geq.in[0] <== in;
    geq.in[1] <== lowerBound;
    
    leq.in[0] <== in;
    leq.in[1] <== upperBound;
    
    out <== geq.out * leq.out;
}

/**
 * 혈액형 검증 서킷
 * 혈액형 코드:
 * 1: A형
 * 2: B형
 * 3: AB형
 * 4: O형
 */
template BloodTypeProof() {
    // 공개 입력: 검증할 혈액형 코드
    signal input targetBloodTypeCode;
    
    // 비공개 입력: 실제 혈액형 코드
    signal input actualBloodTypeCode;
    
    // 출력 신호: 일치 여부 (1: 일치, 0: 불일치)
    signal output isMatch;
    
    // 유효한 혈액형 코드인지 확인 (1-4)
    component validTarget = IsInRange(64);
    validTarget.in <== targetBloodTypeCode;
    validTarget.lowerBound <== 1;
    validTarget.upperBound <== 4;
    
    component validActual = IsInRange(64);
    validActual.in <== actualBloodTypeCode;
    validActual.lowerBound <== 1;
    validActual.upperBound <== 4;
    
    // 혈액형 일치 여부 확인
    component eq = IsEqual();
    eq.in[0] <== actualBloodTypeCode;
    eq.in[1] <== targetBloodTypeCode;
    
    // 결과 출력
    isMatch <== eq.out;
}

component main {public [targetBloodTypeCode]} = BloodTypeProof();
