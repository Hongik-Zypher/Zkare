import CryptoJS from "crypto-js";

/**
 * IPFS 관리 클래스 - Pinata REST API를 사용한 IPFS 연동
 */
class IPFSManager {
  constructor() {
    this.pinataJWT = process.env.REACT_APP_PINATA_JWT;

    if (!this.pinataJWT) {
      console.warn(
        "⚠️ PINATA_JWT가 설정되지 않았습니다. IPFS 기능을 사용할 수 없습니다."
      );
    }

    this.gateway =
      process.env.REACT_APP_PINATA_GATEWAY ||
      "https://gateway.pinata.cloud/ipfs/";
    this.pinataApiUrl = "https://api.pinata.cloud/pinning";
  }

  /**
   * 암호화된 데이터를 IPFS에 업로드
   * @param {string} encryptedData - 암호화된 데이터 (Base64 또는 문자열)
   * @param {string} fileName - 파일 이름 (선택사항)
   * @returns {Promise<Object>} {cid, hash}
   */
  async uploadEncryptedData(encryptedData, fileName = "encrypted_data.json") {
    try {
      if (!this.pinataJWT) {
        throw new Error(
          "Pinata JWT가 설정되지 않았습니다. PINATA_JWT를 확인해주세요."
        );
      }

      console.log("📤 IPFS에 데이터 업로드 시작...");

      // 데이터를 JSON 문자열로 변환
      const jsonData = JSON.stringify({ data: encryptedData });

      // FormData 생성
      const formData = new FormData();
      const blob = new Blob([jsonData], { type: "application/json" });
      formData.append("file", blob, fileName);

      // 메타데이터 설정
      const metadata = JSON.stringify({
        name: fileName,
        keyvalues: {
          uploadTime: new Date().toISOString(),
        },
      });
      formData.append("pinataMetadata", metadata);

      // 옵션 설정
      const options = JSON.stringify({
        cidVersion: 0,
      });
      formData.append("pinataOptions", options);

      // Pinata API에 업로드 요청
      const response = await fetch(`${this.pinataApiUrl}/pinFileToIPFS`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.pinataJWT}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        throw new Error(`Pinata 업로드 실패: ${JSON.stringify(errorData)}`);
      }

      const uploadResult = await response.json();
      const cid = uploadResult.IpfsHash;

      if (!cid) {
        throw new Error("CID를 받지 못했습니다.");
      }

      console.log("✅ IPFS 업로드 완료. CID:", cid);

      // 데이터의 SHA-256 해시 계산 (무결성 검증용)
      const hash = CryptoJS.SHA256(encryptedData).toString();
      console.log("🔐 데이터 해시:", hash);

      return {
        cid: cid,
        hash: hash,
      };
    } catch (error) {
      console.error("❌ IPFS 업로드 중 오류:", error);
      throw error;
    }
  }

  /**
   * CID로 IPFS에서 데이터 조회
   * @param {string} cid - IPFS Content Identifier
   * @returns {Promise<string>} 암호화된 데이터
   */
  async retrieveData(cid) {
    try {
      console.log("📥 IPFS에서 데이터 조회 시작. CID:", cid);

      // IPFS Gateway를 통해 데이터 가져오기
      const gatewayUrl = `${this.gateway}${cid}`;
      const response = await fetch(gatewayUrl);

      if (!response.ok) {
        throw new Error(`IPFS 데이터 조회 실패: ${response.statusText}`);
      }

      const jsonData = await response.json();
      const encryptedData = jsonData.data;

      console.log("✅ IPFS 데이터 조회 완료");
      return encryptedData;
    } catch (error) {
      console.error("❌ IPFS 데이터 조회 중 오류:", error);
      throw error;
    }
  }

  /**
   * 데이터 무결성 검증
   * @param {string} data - 검증할 데이터
   * @param {string} expectedHash - 블록체인에 저장된 예상 해시
   * @returns {boolean} 검증 결과
   */
  verifyIntegrity(data, expectedHash) {
    try {
      const actualHash = CryptoJS.SHA256(data).toString();
      const isValid = actualHash === expectedHash;

      if (!isValid) {
        console.error("❌ 무결성 검증 실패!");
        console.error("예상 해시:", expectedHash);
        console.error("실제 해시:", actualHash);
      } else {
        console.log("✅ 무결성 검증 성공");
      }

      return isValid;
    } catch (error) {
      console.error("❌ 무결성 검증 중 오류:", error);
      return false;
    }
  }

  /**
   * IPFS에서 데이터를 조회하고 무결성을 검증
   * @param {string} cid - IPFS Content Identifier
   * @param {string} expectedHash - 블록체인에 저장된 예상 해시
   * @returns {Promise<string>} 검증된 암호화된 데이터
   */
  async retrieveAndVerifyData(cid, expectedHash) {
    try {
      // IPFS에서 데이터 조회
      const encryptedData = await this.retrieveData(cid);

      // 무결성 검증
      const isValid = this.verifyIntegrity(encryptedData, expectedHash);

      if (!isValid) {
        throw new Error(
          "데이터 무결성 검증 실패. 데이터가 변조되었을 수 있습니다."
        );
      }

      return encryptedData;
    } catch (error) {
      console.error("❌ 데이터 조회 및 검증 중 오류:", error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
const ipfsManager = new IPFSManager();

export default ipfsManager;

// 편의 함수들
export const uploadToIPFS = (encryptedData, fileName) =>
  ipfsManager.uploadEncryptedData(encryptedData, fileName);

export const retrieveFromIPFS = (cid) => ipfsManager.retrieveData(cid);

export const verifyDataIntegrity = (data, expectedHash) =>
  ipfsManager.verifyIntegrity(data, expectedHash);

export const retrieveAndVerifyFromIPFS = (cid, expectedHash) =>
  ipfsManager.retrieveAndVerifyData(cid, expectedHash);
