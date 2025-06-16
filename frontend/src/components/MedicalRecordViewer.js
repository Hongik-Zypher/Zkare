import React, { useState, useEffect } from 'react';
import { decryptMedicalRecord } from '../utils/encryption';

const MedicalRecordViewer = ({ 
    keyRegistryContract, 
    medicalRecordContract, 
    currentAccount 
}) => {
    const [records, setRecords] = useState([]);
    const [patientInfo, setPatientInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [privateKey, setPrivateKey] = useState('');
    const [isDoctor, setIsDoctor] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState('');
    const [decryptedRecords, setDecryptedRecords] = useState([]);

    useEffect(() => {
        checkUserStatus();
    }, [currentAccount]);

    const checkUserStatus = async () => {
        if (!keyRegistryContract || !currentAccount) return;
        
        try {
            console.log('🔍 사용자 상태 확인 중...', currentAccount);
            const doctorStatus = await keyRegistryContract.isDoctor(currentAccount);
            setIsDoctor(doctorStatus);
            console.log('👤 사용자 역할:', doctorStatus ? '의사' : '환자');
        } catch (error) {
            console.error('❌ 사용자 상태 확인 오류:', error);
        }
    };

    const handlePrivateKeyUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log('🔑 [개인키] 업로드 →', file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                const key = e.target.result;
                setPrivateKey(key);
                console.log('✅ [개인키] 로드 완료 → 메모리에만 저장');
            };
            reader.readAsText(file);
        }
    };

    const loadPatientRecords = async (patientAddress = null) => {
        const targetAddress = patientAddress || currentAccount;
        
        if (!medicalRecordContract || !targetAddress) return;
        
        console.log('📋 [기록 조회] 시작');
        setLoading(true);
        try {
            // 환자 정보 가져오기
            const info = await medicalRecordContract.getPatientInfo(targetAddress);
            
            setPatientInfo({
                name: info.name,
                encryptedBasicInfo: info.encryptedBasicInfo,
                encryptedDoctorKey: info.encryptedDoctorKey,
                encryptedPatientKey: info.encryptedPatientKey,
                timestamp: info.timestamp.toString(),
                isRegistered: info.isRegistered
            });
            
            // 진료기록 수 가져오기
            const recordCount = await medicalRecordContract.getRecordCount(targetAddress);
            
            const loadedRecords = [];
            
            for (let i = 0; i < recordCount; i++) {
                const record = await medicalRecordContract.getMedicalRecord(targetAddress, i);
                loadedRecords.push({
                    id: i,
                    encryptedData: record.encryptedData,
                    encryptedDoctorKey: record.encryptedDoctorKey,
                    encryptedPatientKey: record.encryptedPatientKey,
                    doctor: record.doctor,
                    timestamp: record.timestamp.toString()
                });
            }
            
            setRecords(loadedRecords);
            console.log('✅ [기록 조회] 완료 → 총', recordCount.toString(), '건');
        } catch (error) {
            console.error('❌ 기록 로드 오류:', error);
            alert('진료기록을 불러오는 중 오류가 발생했습니다.');
        }
        setLoading(false);
    };

    const decryptRecord = async (record) => {
        if (!privateKey) {
            alert('개인키를 먼저 업로드해주세요.');
            return;
        }
        
        console.log(`🔓 [기록 ${record.id + 1}] 복호화 시작`);
        
        try {
            const encryptedDataObj = JSON.parse(record.encryptedData);
            
            const encryptedData = {
                encryptedRecord: encryptedDataObj.encryptedRecord,
                encryptedAESKeyForDoctor: record.encryptedDoctorKey,
                encryptedAESKeyForPatient: record.encryptedPatientKey,
                iv: encryptedDataObj.iv
            };
            
            const decryptedData = await decryptMedicalRecord(encryptedData, privateKey, isDoctor);
            
            return {
                ...record,
                decryptedData: decryptedData,
                isDecrypted: true
            };
        } catch (error) {
            console.error('❌ [복호화] 실패:', error.message);
            alert('기록 복호화 중 오류가 발생했습니다. 올바른 개인키인지 확인해주세요.');
            return null;
        }
    };

    const decryptPatientInfo = async () => {
        if (!privateKey || !patientInfo) {
            alert('개인키와 환자 정보가 필요합니다.');
            return;
        }
        
        try {
            const encryptedDataObj = JSON.parse(patientInfo.encryptedBasicInfo);
            const encryptedData = {
                encryptedRecord: encryptedDataObj.encryptedRecord,
                encryptedAESKeyForDoctor: patientInfo.encryptedDoctorKey,
                encryptedAESKeyForPatient: patientInfo.encryptedPatientKey,
                iv: encryptedDataObj.iv
            };
            
            const decryptedData = await decryptMedicalRecord(encryptedData, privateKey, isDoctor);
            
            setPatientInfo({
                ...patientInfo,
                decryptedBasicInfo: decryptedData,
                isBasicInfoDecrypted: true
            });
        } catch (error) {
            console.error('환자 정보 복호화 오류:', error);
            alert('환자 정보 복호화 중 오류가 발생했습니다.');
        }
    };

    const handleDecryptAllRecords = async () => {
        if (!privateKey) {
            alert('개인키를 먼저 업로드해주세요.');
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
        return new Date(parseInt(timestamp) * 1000).toLocaleString('ko-KR');
    };

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
                    <span className={privateKey ? 'key-status success' : 'key-status'}>
                        {privateKey ? '✅ 개인키 로드됨 (메모리에만 저장)' : '❌ 개인키 파일을 업로드하세요'}
                    </span>
                    {privateKey && (
                        <button 
                            onClick={() => {
                                setPrivateKey('');
                                console.log('🗑️ 개인키가 메모리에서 삭제되었습니다.');
                                alert('개인키가 메모리에서 삭제되었습니다.');
                            }}
                            style={{ 
                                marginLeft: '10px', 
                                padding: '5px 10px', 
                                backgroundColor: '#f44336', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            🗑️ 개인키 삭제
                        </button>
                    )}
                </div>
                <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                    * 개인키는 메모리에만 저장되며, 페이지 새로고침 시 자동으로 삭제됩니다.
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
                        {loading ? '로딩 중...' : '내 진료기록 로드'}
                    </button>
                </div>
            )}

            {patientInfo && (
                <div className="patient-info-section">
                    <h4>👤 환자 정보</h4>
                    <div className="patient-info">
                        <p><strong>이름:</strong> {patientInfo.name}</p>
                        <p><strong>등록일:</strong> {formatDate(patientInfo.timestamp)}</p>
                        
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
                                <p><strong>키:</strong> {patientInfo.decryptedBasicInfo.height} cm</p>
                                <p><strong>몸무게:</strong> {patientInfo.decryptedBasicInfo.weight} kg</p>
                                <p><strong>혈액형:</strong> {patientInfo.decryptedBasicInfo.bloodType}</p>
                                <p><strong>주민번호:</strong> {patientInfo.decryptedBasicInfo.ssn.replace(/(\d{6})-?(\d{7})/, '$1-*******')}</p>
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
                            {loading ? '복호화 중...' : '모든 기록 복호화'}
                        </button>
                    </div>

                    <div className="records-list">
                        {(decryptedRecords.length > 0 ? decryptedRecords : records).map((record, index) => (
                            <div key={record.id} className="record-item">
                                <div className="record-header">
                                    <h5>진료기록 #{record.id + 1}</h5>
                                    <span className="record-date">{formatDate(record.timestamp)}</span>
                                    <span className="doctor-address">의사: {record.doctor}</span>
                                </div>
                                
                                {record.isDecrypted ? (
                                    <div className="decrypted-content">
                                        <div className="medical-data">
                                            <p><strong>증상:</strong> {record.decryptedData.symptoms}</p>
                                            <p><strong>진단:</strong> {record.decryptedData.diagnosis}</p>
                                            <p><strong>치료:</strong> {record.decryptedData.treatment}</p>
                                            <p><strong>처방:</strong> {record.decryptedData.prescription}</p>
                                            {record.decryptedData.notes && (
                                                <p><strong>메모:</strong> {record.decryptedData.notes}</p>
                                            )}
                                            <p><strong>진료일:</strong> {new Date(record.decryptedData.date).toLocaleString('ko-KR')}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="encrypted-content">
                                        <p>🔒 암호화된 데이터</p>
                                        <button 
                                            onClick={() => decryptRecord(record).then(decrypted => {
                                                if (decrypted) {
                                                    const updated = [...decryptedRecords];
                                                    updated[index] = decrypted;
                                                    setDecryptedRecords(updated);
                                                }
                                            })}
                                            disabled={!privateKey}
                                            className="decrypt-single-button"
                                        >
                                            이 기록 복호화
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
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