const { assert } = require("chai");
const wasm_tester = require("circom_tester").wasm;
const path = require("path");

describe("의료 기록 증명 서킷 테스트", function() {
  let circuit;

  before(async function() {
    // 테스트 준비 시간이 오래 걸릴 수 있음
    this.timeout(100000);
    circuit = await wasm_tester(path.join(__dirname, "../src/medical_record_proof.circom"));
  });

  it("의료 기록 해시와 환자 정보로 유효한 증명을 생성해야 함", async function() {
    this.timeout(100000);

    // 실제 의료 기록 데이터를 모방한 입력값
    const input = {
      "recordHash": [123456789, 987654321], // 의료 기록 해시
      "patientAddress": 111222333444, // 환자 주소
      "doctorAddress": 555666777888, // 의사 주소
      "timestamp": 1678901234, // 진료 시간
      "nullifier": 987654321, // 필수 입력이지만 테스트에서 중요하지 않음
      "secret": 123456789, // 환자의 비밀값
      "nullifierHash": 0 // 테스트에서 검증되지 않음
    };

    // 서킷 실행
    const witness = await circuit.calculateWitness(input);
    
    // 에러 체크
    await circuit.checkConstraints(witness);
    
    // 출력값 추출
    const hashOutput = witness[1]; // hashOutput
    
    // 출력값이 0이 아님을 확인 (유효한 해시가 생성되었는지)
    assert.notEqual(hashOutput, 0);
  });
  
  it("같은 의료 기록은 같은 해시 출력을 생성해야 함 (일관성 테스트)", async function() {
    this.timeout(100000);
    
    // 동일한 의료 기록 데이터
    const input1 = {
      "recordHash": [123456789, 987654321],
      "patientAddress": 111222333444,
      "doctorAddress": 555666777888,
      "timestamp": 1678901234,
      "nullifier": 987654321,
      "secret": 123456789,
      "nullifierHash": 0
    };
    
    const input2 = {
      "recordHash": [123456789, 987654321],
      "patientAddress": 111222333444,
      "doctorAddress": 555666777888,
      "timestamp": 1678901234,
      "nullifier": 987654321,
      "secret": 123456789,
      "nullifierHash": 0
    };
    
    // 두 번 서킷 실행
    const witness1 = await circuit.calculateWitness(input1);
    const witness2 = await circuit.calculateWitness(input2);
    
    // 출력값이 동일한지 확인 (결정론적 해시)
    assert.equal(witness1[1].toString(), witness2[1].toString()); // hashOutput
  });
  
  it("서로 다른 의료 기록은 서로 다른 해시 출력을 생성해야 함 (충돌 방지)", async function() {
    this.timeout(100000);
    
    // 기준 의료 기록
    const input1 = {
      "recordHash": [123456789, 987654321],
      "patientAddress": 111222333444,
      "doctorAddress": 555666777888,
      "timestamp": 1678901234,
      "nullifier": 987654321,
      "secret": 123456789,
      "nullifierHash": 0
    };
    
    // 환자가 다른 의료 기록
    const input2 = {
      "recordHash": [123456789, 987654321],
      "patientAddress": 999888777666, // 다른 환자
      "doctorAddress": 555666777888,
      "timestamp": 1678901234,
      "nullifier": 987654321,
      "secret": 123456789,
      "nullifierHash": 0
    };
    
    // 진단 결과가 다른 의료 기록
    const input3 = {
      "recordHash": [555555555, 987654321], // 다른 진단 결과
      "patientAddress": 111222333444,
      "doctorAddress": 555666777888,
      "timestamp": 1678901234,
      "nullifier": 987654321,
      "secret": 123456789,
      "nullifierHash": 0
    };
    
    // 각 서킷 실행
    const witness1 = await circuit.calculateWitness(input1);
    const witness2 = await circuit.calculateWitness(input2);
    const witness3 = await circuit.calculateWitness(input3);
    
    // 출력값이 서로 다른지 확인
    assert.notEqual(witness1[1].toString(), witness2[1].toString()); // 다른 환자 -> 다른 해시
    assert.notEqual(witness1[1].toString(), witness3[1].toString()); // 다른 진단 -> 다른 해시
    assert.notEqual(witness2[1].toString(), witness3[1].toString()); // 모두 다름
  });
  
  it("비밀값이 달라도 의료 기록의 무결성이 보장되어야 함", async function() {
    this.timeout(100000);
    
    // 같은 의료 기록, 다른 비밀값
    const input1 = {
      "recordHash": [123456789, 987654321],
      "patientAddress": 111222333444,
      "doctorAddress": 555666777888,
      "timestamp": 1678901234,
      "nullifier": 987654321,
      "secret": 123456789, // 비밀값 1
      "nullifierHash": 0
    };
    
    const input2 = {
      "recordHash": [123456789, 987654321],
      "patientAddress": 111222333444,
      "doctorAddress": 555666777888,
      "timestamp": 1678901234,
      "nullifier": 987654321,
      "secret": 987654321, // 다른 비밀값
      "nullifierHash": 0
    };
    
    // 두 서킷 실행
    const witness1 = await circuit.calculateWitness(input1);
    const witness2 = await circuit.calculateWitness(input2);
    
    // 비밀값이 다르면 출력 해시도 달라야 함 (개인정보 보호)
    assert.notEqual(witness1[1].toString(), witness2[1].toString());
  });
}); 