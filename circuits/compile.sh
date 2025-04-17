#!/bin/bash

# 필요한 디렉토리 생성
mkdir -p medical_record_proof/build

# 현재 디렉토리
CIRCUITS_DIR=$(pwd)
MEDICAL_RECORD_DIR="$CIRCUITS_DIR/medical_record_proof"

# 서킷 컴파일
echo "🔧 medical_record_proof 서킷 컴파일 중..."
circom "$MEDICAL_RECORD_DIR/medical_record_proof.circom" --r1cs --wasm --sym -o "$MEDICAL_RECORD_DIR/build"

# 작업 디렉토리 변경
cd "$MEDICAL_RECORD_DIR/build"

# WASM 파일 복사
cp medical_record_proof_js/medical_record_proof.wasm ../medical_record_proof.wasm

# 키 생성
echo "🔑 Powers of Tau 파일 다운로드 중..."
curl -L -o powersOfTau28_hez_final_15.ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau

echo "🔑 ZKEY 파일 생성 중..."
snarkjs groth16 setup medical_record_proof.r1cs powersOfTau28_hez_final_15.ptau medical_record_proof_0000.zkey

echo "🧙‍♂️ 제공자 기여 중..."
echo "test" | snarkjs zkey contribute medical_record_proof_0000.zkey medical_record_proof_0001.zkey --name="First contribution" -v

echo "⚡ 최종 ZKEY 파일 생성 중..."
snarkjs zkey beacon medical_record_proof_0001.zkey medical_record_proof_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"

echo "🔍 Verification key 생성 중..."
snarkjs zkey export verificationkey medical_record_proof_final.zkey verification_key.json

# 결과 파일 복사
cp medical_record_proof_final.zkey ../medical_record_proof_final.zkey
cp verification_key.json ../verification_key.json

echo "✅ 모든 작업이 완료되었습니다!" 