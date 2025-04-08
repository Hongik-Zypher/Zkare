import { useState } from "react";
import { ethers } from "ethers";
import MedicalRecordStorageABI from "./abis/MedicalRecordStorage.json";
import MedicalRecordViewerABI from "./abis/MedicalRecordViewer.json";

const STORAGE_ADDRESS = "0x26F7bE5cad3c6CDd6C06270bd4Fb2AfBDe7Cfb7C";
const VIEWER_ADDRESS = "0xeE721a9383Df1DBf85eCDF1F851F9691F3Baced0";

function App() {
  const [diagnosis, setDiagnosis] = useState("");
  const [treated, setTreated] = useState(false);
  const [date, setDate] = useState("");
  const [recordCount, setRecordCount] = useState<number>(0);
  const [recordIndex, setRecordIndex] = useState<number>(0);
  const [viewedRecord, setViewedRecord] = useState<
    [string, boolean, string] | null
  >(null);

  const [storageContract, setStorageContract] =
    useState<ethers.Contract | null>(null);
  const [viewerContract, setViewerContract] = useState<ethers.Contract | null>(
    null
  );
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const connectWallet = async () => {
    if (!(window as any).ethereum) return alert("Metamask 설치 필요");
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    setSigner(signer);

    const storage = new ethers.Contract(
      STORAGE_ADDRESS,
      MedicalRecordStorageABI.abi,
      signer
    );
    const viewer = new ethers.Contract(
      VIEWER_ADDRESS,
      MedicalRecordViewerABI.abi,
      signer
    );

    setStorageContract(storage);
    setViewerContract(viewer);
  };

  const registerRecord = async () => {
    if (!storageContract) return;
    const tx = await storageContract.registerRecord(diagnosis, treated, date);
    await tx.wait();
    alert("기록 등록 완료");
  };

  const fetchRecordCount = async () => {
    if (!viewerContract || !signer) return;
    const address = await signer.getAddress();
    const count = await viewerContract.getRecordCount(address);
    setRecordCount(Number(count));
  };

  const fetchRecord = async () => {
    if (!viewerContract || !signer) return;

    const address = await signer.getAddress();
    const count = await viewerContract.getRecordCount(address);

    console.log("📊 기록 개수:", count);

    if (recordIndex >= count) {
      alert(
        `유효하지 않은 인덱스입니다. 0 ~ ${count - 1} 범위로 입력해주세요.`
      );
      return;
    }

    const result = await viewerContract.getRecord(address, recordIndex);
    setViewedRecord(result);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Zkare Demo UI</h1>
      <button onClick={connectWallet}>🔗 지갑 연결</button>

      <h2>📥 진료 기록 등록</h2>
      <input
        placeholder="진단명"
        value={diagnosis}
        onChange={(e) => setDiagnosis(e.target.value)}
      />
      <br />
      <label>
        <input
          type="checkbox"
          checked={treated}
          onChange={(e) => setTreated(e.target.checked)}
        />{" "}
        치료 완료 여부
      </label>
      <br />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <br />
      <button onClick={registerRecord}>✅ 등록</button>

      <h2>📖 진료 기록 조회</h2>
      <button onClick={fetchRecordCount}>📊 내 기록 개수 보기</button>
      <p>총 기록 수: {recordCount}</p>

      <input
        type="number"
        value={recordIndex}
        onChange={(e) => setRecordIndex(Number(e.target.value))}
      />
      <button onClick={fetchRecord}>🔍 조회</button>

      {viewedRecord && (
        <div>
          <p>
            <b>진단명:</b> {viewedRecord[0]}
          </p>
          <p>
            <b>치료 여부:</b> {viewedRecord[1] ? "O" : "X"}
          </p>
          <p>
            <b>진료일자:</b> {viewedRecord[2]}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
