import React, { useState, useEffect } from "react";
import {
  isDoctor as checkIsDoctor,
  isPublicKeyRegistered as checkIsPublicKeyRegistered,
  getEncryptedMedicalRecordContract,
  getPatientInfoWithIPFS,
  getMedicalRecordWithIPFS,
} from "../utils/contracts";

const MedicalRecordViewer = ({
  keyRegistryContract,
  medicalRecordContract,
  currentAccount,
}) => {
  const [records, setRecords] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [isDoctor, setIsDoctor] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [decryptedRecords, setDecryptedRecords] = useState([]);
  const [hasPublicKey, setHasPublicKey] = useState(true);
  const [checkingKey, setCheckingKey] = useState(true);

  useEffect(() => {
    checkUserStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount]);

  const checkUserStatus = async () => {
    if (!currentAccount) {
      setCheckingKey(false);
      return;
    }

    setCheckingKey(true);
    try {
      console.log("🔍 사용자 상태 확인 중...", currentAccount);

      // contracts.js의 함수 사용 (ENS 에러 없음)
      const keyRegistered = await checkIsPublicKeyRegistered(currentAccount);
      setHasPublicKey(keyRegistered);
      console.log("🔑 공개키 등록 여부:", keyRegistered);

      if (!keyRegistered) {
        console.log("⚠️ 공개키가 등록되지 않았습니다. 키 생성이 필요합니다.");
        setCheckingKey(false);
        return;
      }

      const doctorStatus = await checkIsDoctor(currentAccount);
      setIsDoctor(doctorStatus);
      console.log("👤 사용자 역할:", doctorStatus ? "의사" : "환자");
    } catch (error) {
      console.error("❌ 사용자 상태 확인 오류:", error);
    } finally {
      setCheckingKey(false);
    }
  };

  const handlePrivateKeyUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("🔑 [개인키] 업로드 →", file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const key = e.target.result;
        setPrivateKey(key);
        console.log("✅ [개인키] 로드 완료 → 메모리에만 저장");
      };
      reader.readAsText(file);
    }
  };

  const loadPatientRecords = async (patientAddress = null) => {
    const targetAddress = patientAddress || currentAccount;

    if (!targetAddress) return;

    console.log("📋 [기록 조회] 시작");
    setLoading(true);
    try {
      const contract = await getEncryptedMedicalRecordContract();
      if (!contract) {
        throw new Error("컨트랙트가 초기화되지 않았습니다.");
      }

      // 환자 정보 가져오기 (메타데이터만 - IPFS CID와 Hash)
      const info = await contract.getPatientInfo(targetAddress);

      setPatientInfo({
        name: info.name,
        ipfsCid: info.ipfsCid,
        dataHash: info.dataHash,
        encryptedDoctorKey: info.encryptedDoctorKey,
        encryptedPatientKey: info.encryptedPatientKey,
        timestamp: info.timestamp.toString(),
        isRegistered: info.isRegistered,
      });

      // 진료기록 수 가져오기
      const recordCount = await contract.getRecordCount(targetAddress);

      const loadedRecords = [];

      // 메타데이터만 먼저 로드 (IPFS CID와 Hash)
      for (let i = 0; i < recordCount; i++) {
        const record = await contract.getMedicalRecord(targetAddress, i);
        loadedRecords.push({
          id: i,
          ipfsCid: record.ipfsCid,
          dataHash: record.dataHash,
          encryptedDoctorKey: record.encryptedDoctorKey,
          encryptedPatientKey: record.encryptedPatientKey,
          doctor: record.doctor,
          timestamp: record.timestamp.toString(),
        });
      }

      setRecords(loadedRecords);
      console.log("✅ [기록 조회] 완료 → 총", recordCount.toString(), "건");
    } catch (error) {
      console.error("❌ 기록 로드 오류:", error);
      alert("진료기록을 불러오는 중 오류가 발생했습니다: " + error.message);
    }
    setLoading(false);
  };

  const decryptRecord = async (record) => {
    if (!privateKey) {
      alert("개인키를 먼저 업로드해주세요.");
      return;
    }

    console.log(`🔓 [기록 ${record.id + 1}] 복호화 시작`);

    try {
      // IPFS에서 데이터를 가져와서 복호화
      const targetAddress = selectedPatient || currentAccount;
      const decryptedData = await getMedicalRecordWithIPFS(
        targetAddress,
        record.id,
        privateKey,
        isDoctor
      );

      return {
        ...record,
        decryptedData: decryptedData.record,
        isDecrypted: true,
      };
    } catch (error) {
      console.error("❌ [복호화] 실패:", error.message);
      alert("기록 복호화 중 오류가 발생했습니다: " + error.message);
      return null;
    }
  };

  const decryptPatientInfo = async () => {
    if (!privateKey || !patientInfo) {
      alert("개인키와 환자 정보가 필요합니다.");
      return;
    }

    try {
      const targetAddress = selectedPatient || currentAccount;
      const decryptedInfo = await getPatientInfoWithIPFS(
        targetAddress,
        privateKey,
        isDoctor
      );

      setPatientInfo({
        ...patientInfo,
        decryptedBasicInfo: decryptedInfo.basicInfo,
        isBasicInfoDecrypted: true,
      });
    } catch (error) {
      console.error("환자 정보 복호화 오류:", error);
      alert("환자 정보 복호화 중 오류가 발생했습니다: " + error.message);
    }
  };

  const handleDecryptAllRecords = async () => {
    if (!privateKey) {
      alert("개인키를 먼저 업로드해주세요.");
      return;
    }

    setLoading(true);
    const decrypted = [];

    for (const record of records) {
      const decryptedRecord = await decryptRecord(record);
      if (decryptedRecord) {
        decrypted.push(decryptedRecord);
      }
    }

    setDecryptedRecords(decrypted);
    setLoading(false);
  };

  const formatDate = (timestamp) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString("ko-KR");
  };

  // 키 확인 중
  if (checkingKey) {
    return (
      <div className="medical-record-viewer">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>키 상태 확인 중...</p>
        </div>
      </div>
    );
  }

  // 공개키가 등록되지 않은 경우
  if (!hasPublicKey) {
    return (
      <div className="medical-record-viewer">
        <div
          style={{
            border: "2px solid #ff9800",
            borderRadius: "8px",
            padding: "30px",
            backgroundColor: "#fff3e0",
            textAlign: "center",
          }}
        >
          <h3 style={{ color: "#f57c00", marginBottom: "20px" }}>
            ⚠️ 먼저 키를 생성해야 합니다
          </h3>
          <p style={{ fontSize: "16px", marginBottom: "10px" }}>
            진료기록을 조회하려면 먼저 RSA 키 쌍을 생성하고 공개키를 등록해야
            합니다.
          </p>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "30px" }}>
            개인키는 안전하게 다운로드되며, 이 키로만 암호화된 의료기록을
            복호화할 수 있습니다.
          </p>
          <button
            onClick={() => {
              // 같은 페이지 상단으로 스크롤하거나 키 생성 섹션으로 안내
              window.scrollTo({ top: 0, behavior: "smooth" });
              alert(
                '페이지 상단의 "🔑 암호화 키 등록이 필요합니다" 섹션에서 키를 생성해주세요.'
              );
            }}
            style={{
              padding: "12px 30px",
              fontSize: "16px",
              backgroundColor: "#2e7d32",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            키 생성 섹션으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="medical-record-viewer">
      <h3>📋 진료기록 조회</h3>

      <div className="private-key-section">
        <h4>🔑 개인키 업로드</h4>
        <div className="key-upload">
          <input
            type="file"
            accept=".txt"
            onChange={handlePrivateKeyUpload}
            className="file-input"
          />
          <span className={privateKey ? "key-status success" : "key-status"}>
            {privateKey
              ? "✅ 개인키 로드됨 (메모리에만 저장)"
              : "❌ 개인키 파일을 업로드하세요"}
          </span>
          {privateKey && (
            <button
              onClick={() => {
                setPrivateKey("");
                console.log("🗑️ 개인키가 메모리에서 삭제되었습니다.");
                alert("개인키가 메모리에서 삭제되었습니다.");
              }}
              style={{
                marginLeft: "10px",
                padding: "5px 10px",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              🗑️ 개인키 삭제
            </button>
          )}
        </div>
        <small style={{ color: "#666", display: "block", marginTop: "5px" }}>
          * 개인키는 메모리에만 저장되며, 페이지 새로고침 시 자동으로
          삭제됩니다.
        </small>
      </div>

      {isDoctor && (
        <div className="doctor-section">
          <h4>👨‍⚕️ 환자 선택 (의사용)</h4>
          <div className="patient-selection">
            <input
              type="text"
              placeholder="환자 주소 입력"
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="address-input"
            />
            <button
              onClick={() => loadPatientRecords(selectedPatient)}
              disabled={loading || !selectedPatient}
              className="load-button"
            >
              환자 기록 로드
            </button>
          </div>
        </div>
      )}

      {!isDoctor && (
        <div className="patient-section">
          <button
            onClick={() => loadPatientRecords()}
            disabled={loading}
            className="load-button"
          >
            {loading ? "로딩 중..." : "내 진료기록 로드"}
          </button>
        </div>
      )}

      {patientInfo && (
        <div className="patient-info-section">
          <h4>👤 환자 정보</h4>
          <div className="patient-info">
            <p>
              <strong>이름:</strong> {patientInfo.name}
            </p>
            <p>
              <strong>등록일:</strong> {formatDate(patientInfo.timestamp)}
            </p>

            {!patientInfo.isBasicInfoDecrypted ? (
              <button
                onClick={decryptPatientInfo}
                disabled={!privateKey}
                className="decrypt-button"
              >
                기본정보 복호화
              </button>
            ) : (
              <div className="decrypted-basic-info">
                <h5>기본정보:</h5>
                <p>
                  <strong>키:</strong> {patientInfo.decryptedBasicInfo.height}{" "}
                  cm
                </p>
                <p>
                  <strong>몸무게:</strong>{" "}
                  {patientInfo.decryptedBasicInfo.weight} kg
                </p>
                <p>
                  <strong>혈액형:</strong>{" "}
                  {patientInfo.decryptedBasicInfo.bloodType}
                </p>
                <p>
                  <strong>주민번호:</strong>{" "}
                  {patientInfo.decryptedBasicInfo.ssn.replace(
                    /(\d{6})-?(\d{7})/,
                    "$1-*******"
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {records.length > 0 && (
        <div className="records-section">
          <div className="records-header">
            <h4>📊 진료기록 ({records.length}건)</h4>
            <button
              onClick={handleDecryptAllRecords}
              disabled={loading || !privateKey}
              className="decrypt-all-button"
            >
              {loading ? "복호화 중..." : "모든 기록 복호화"}
            </button>
          </div>

          <div className="records-list">
            {(decryptedRecords.length > 0 ? decryptedRecords : records).map(
              (record, index) => (
                <div key={record.id} className="record-item">
                  <div className="record-header">
                    <h5>진료기록 #{record.id + 1}</h5>
                    <span className="record-date">
                      {formatDate(record.timestamp)}
                    </span>
                    <span className="doctor-address">
                      의사: {record.doctor}
                    </span>
                  </div>

                  {record.isDecrypted ? (
                    <div className="decrypted-content">
                      <div className="medical-data">
                        <p>
                          <strong>증상:</strong> {record.decryptedData.symptoms}
                        </p>
                        <p>
                          <strong>진단:</strong>{" "}
                          {record.decryptedData.diagnosis}
                        </p>
                        <p>
                          <strong>치료:</strong>{" "}
                          {record.decryptedData.treatment}
                        </p>
                        <p>
                          <strong>처방:</strong>{" "}
                          {record.decryptedData.prescription}
                        </p>
                        {record.decryptedData.notes && (
                          <p>
                            <strong>메모:</strong> {record.decryptedData.notes}
                          </p>
                        )}
                        <p>
                          <strong>진료일:</strong>{" "}
                          {new Date(record.decryptedData.date).toLocaleString(
                            "ko-KR"
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="encrypted-content">
                      <p>🔒 암호화된 데이터</p>
                      <button
                        onClick={() =>
                          decryptRecord(record).then((decrypted) => {
                            if (decrypted) {
                              const updated = [...decryptedRecords];
                              updated[index] = decrypted;
                              setDecryptedRecords(updated);
                            }
                          })
                        }
                        disabled={!privateKey}
                        className="decrypt-single-button"
                      >
                        이 기록 복호화
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {records.length === 0 && patientInfo && (
        <div className="no-records">
          <p>진료기록이 없습니다.</p>
        </div>
      )}
    </div>
  );
};

export default MedicalRecordViewer;
