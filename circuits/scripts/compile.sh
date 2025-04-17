#!/bin/bash

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 색상 초기화

# 스크립트가 실패하면 바로 종료
set -e

# 함수: 에러 메시지 출력 후 종료
error_exit() {
  echo -e "${RED}[오류] $1${NC}" >&2
  exit 1
}

# 함수: 정보 메시지 출력
info() {
  echo -e "${BLUE}[정보] $1${NC}"
}

# 함수: 성공 메시지 출력
success() {
  echo -e "${GREEN}[성공] $1${NC}"
}

# 함수: 경고 메시지 출력
warning() {
  echo -e "${YELLOW}[경고] $1${NC}"
}

# 경로 설정
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="${PROJECT_ROOT}/src"

# 인자 확인
if [ "$#" -lt 2 ]; then
  error_exit "사용법: $0 <회로_디렉토리_이름> <회로_파일_이름>"
fi

CIRCUIT_DIR="$1"
CIRCUIT_NAME="$2"

info "회로 컴파일 시작: ${CIRCUIT_DIR}/${CIRCUIT_NAME}.circom"

# 소스 파일 경로
CIRCUIT_PATH="${SRC_DIR}/${CIRCUIT_DIR}/${CIRCUIT_NAME}.circom"

# 파일 존재 확인
if [ ! -f "$CIRCUIT_PATH" ]; then
  error_exit "회로 파일을 찾을 수 없음: ${CIRCUIT_PATH}"
fi

# 빌드 디렉토리 생성
BUILD_DIR="${PROJECT_ROOT}/build/${CIRCUIT_DIR}"
mkdir -p "$BUILD_DIR"
info "빌드 디렉토리 생성: ${BUILD_DIR}"

# 회로 복사
cp "$CIRCUIT_PATH" "${BUILD_DIR}/${CIRCUIT_NAME}.circom"
info "회로 파일 복사 완료"

# circom 컴파일러로 회로 컴파일
cd "$BUILD_DIR"
info "circom 컴파일 시작..."

if ! npx circom "${CIRCUIT_NAME}.circom" --r1cs --wasm; then
  error_exit "circom 컴파일 실패"
fi

success "circom 컴파일 완료"

# 신뢰 설정 생성
info "zkSNARK 키 생성 시작..."

if command -v npx snarkjs &> /dev/null; then
  SNARKJS="npx snarkjs"
else
  SNARKJS="snarkjs"
fi

# Powers of Tau 다운로드 (필요한 경우)
if [ ! -f "${PROJECT_ROOT}/build/pot12_final.ptau" ]; then
  info "Powers of Tau 다운로드 중..."
  
  # Powers of Tau 다운로드 디렉토리 생성
  mkdir -p "${PROJECT_ROOT}/build"
  
  # 파일 다운로드
  curl -o "${PROJECT_ROOT}/build/pot12_final.ptau" https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau || \
    error_exit "Powers of Tau 다운로드 실패"
  
  success "Powers of Tau 다운로드 완료"
fi

# zkey 생성
info "zkey 생성 중..."
"$SNARKJS" groth16 setup "${CIRCUIT_NAME}.r1cs" "${PROJECT_ROOT}/build/pot12_final.ptau" "${CIRCUIT_NAME}_0000.zkey" || \
  error_exit "zkey 설정 실패"

# Phase 2 기여 (개발용 더미 엔트로피)
info "Phase 2 기여 중..."
echo "test" | "$SNARKJS" zkey contribute "${CIRCUIT_NAME}_0000.zkey" "${CIRCUIT_NAME}_final.zkey" || \
  error_exit "zkey 기여 실패"

# 검증 키 추출
info "검증 키 생성 중..."
"$SNARKJS" zkey export verificationkey "${CIRCUIT_NAME}_final.zkey" "${CIRCUIT_NAME}_verification_key.json" || \
  error_exit "검증 키 추출 실패"

success "ZK 회로 컴파일 완료! ${BUILD_DIR}/${CIRCUIT_NAME}.wasm"
info "생성된 파일:"
info "- ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs"
info "- ${BUILD_DIR}/${CIRCUIT_NAME}.wasm"
info "- ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey"
info "- ${BUILD_DIR}/${CIRCUIT_NAME}_verification_key.json" 