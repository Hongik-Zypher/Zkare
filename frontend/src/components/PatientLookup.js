import React, { useState, useEffect } from 'react';
import { encryptMedicalRecord } from '../utils/encryption';

const PatientLookup = ({ 
    keyRegistryContract, 
    medicalRecordContract, 
    currentAccount 
}) => {
    const [patientAddress, setPatientAddress] = useState('');
    const [patientFound, setPatientFound] = useState(null);
    const [patientInfo, setPatientInfo] = useState(null);
    const [isDoctor, setIsDoctor] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // 진료기록 양식
    const [medicalRecordForm, setMedicalRecordForm] = useState({
        // 기본정보 (처음 등록 시에만)
        name: '',
        height: '',
        weight: '',
        bloodType: '',
        ssn: '', // 주민번호 (마스킹 처리 필요)
        
        // 진료기록
        symptoms: '',
        diagnosis: '',
        treatment: '',
        prescription: '',
        notes: ''
    });

    // 의사 여부 확인
    useEffect(() => {
        checkDoctorStatus();
    }, [currentAccount, keyRegistryContract]);

    const checkDoctorStatus = async () => {
        if (!keyRegistryContract || !currentAccount) return;
        
        try {
            const doctorStatus = await keyRegistryContract.isDoctor(currentAccount);
            setIsDoctor(doctorStatus);
        } catch (error) {
            console.error('의사 상태 확인 오류:', error);
        }
    };

    const handlePatientLookup = async () => {
        if (!patientAddress || !keyRegistryContract || !medicalRecordContract) return;
        
        setLoading(true);
        try {
            // 환자의 공개키 등록 여부 확인
            const isRegistered = await keyRegistryContract.isPublicKeyRegistered(patientAddress);
            
            if (!isRegistered) {
                setPatientFound('not_registered');
                setPatientInfo(null);
            } else {
                // 환자 정보 확인
                const isPatientAlreadyRegistered = await medicalRecordContract.isPatientRegistered(patientAddress);
                
                if (isPatientAlreadyRegistered) {
                    setPatientFound('existing');
                    // 기존 환자 정보 가져오기
                    const info = await medicalRecordContract.getPatientInfo(patientAddress);
                    setPatientInfo({
                        name: info.name,
                        isRegistered: info.isRegistered
                    });
                } else {
                    setPatientFound('new');
                    setPatientInfo(null);
                }
            }
        } catch (error) {
            console.error('환자 조회 오류:', error);
            alert('환자 조회 중 오류가 발생했습니다.');
        }
        setLoading(false);
    };

    const handleSubmitMedicalRecord = async () => {
        if (!patientAddress || !keyRegistryContract || !medicalRecordContract) return;
        
        console.log('📝 [진료기록 등록] 시작');
        
        setLoading(true);
        try {
            // 환자와 의사의 공개키 가져오기
            const patientPublicKeyData = await keyRegistryContract.getPublicKey(patientAddress);
            const doctorPublicKeyData = await keyRegistryContract.getPublicKey(currentAccount);
            
            const patientPublicKey = patientPublicKeyData[0]; // key
            const doctorPublicKey = doctorPublicKeyData[0]; // key

            let tx;
            
            if (patientFound === 'new') {
                // 새 환자 등록
                console.log('👤 [신규 환자] 기본정보 등록');
                const basicInfo = {
                    height: medicalRecordForm.height,
                    weight: medicalRecordForm.weight,
                    bloodType: medicalRecordForm.bloodType,
                    ssn: medicalRecordForm.ssn
                };
                
                const encryptedBasicInfo = await encryptMedicalRecord(
                    basicInfo, 
                    doctorPublicKey, 
                    patientPublicKey
                );
                
                tx = await medicalRecordContract.registerPatient(
                    patientAddress,
                    medicalRecordForm.name,
                    JSON.stringify({
                        encryptedRecord: encryptedBasicInfo.encryptedRecord,
                        iv: encryptedBasicInfo.iv
                    }),
                    encryptedBasicInfo.encryptedAESKeyForDoctor,
                    encryptedBasicInfo.encryptedAESKeyForPatient
                );
            }
            
            // 진료기록 추가
            console.log('📋 [진료기록] 추가');
            const medicalData = {
                symptoms: medicalRecordForm.symptoms,
                diagnosis: medicalRecordForm.diagnosis,
                treatment: medicalRecordForm.treatment,
                prescription: medicalRecordForm.prescription,
                notes: medicalRecordForm.notes,
                date: new Date().toISOString()
            };
            
            const encryptedMedicalData = await encryptMedicalRecord(
                medicalData, 
                doctorPublicKey, 
                patientPublicKey
            );
            
            tx = await medicalRecordContract.addMedicalRecord(
                patientAddress,
                JSON.stringify({
                    encryptedRecord: encryptedMedicalData.encryptedRecord,
                    iv: encryptedMedicalData.iv
                }),
                encryptedMedicalData.encryptedAESKeyForDoctor,
                encryptedMedicalData.encryptedAESKeyForPatient
            );
            
            await tx.wait();
            console.log('✅ [진료기록] 저장 완료');
            alert('진료기록이 성공적으로 저장되었습니다!');
            
            // 폼 초기화
            setMedicalRecordForm({
                name: '',
                height: '',
                weight: '',
                bloodType: '',
                ssn: '',
                symptoms: '',
                diagnosis: '',
                treatment: '',
                prescription: '',
                notes: ''
            });
            
        } catch (error) {
            console.error('❌ 진료기록 저장 오류:', error);
            console.error('🔍 오류 상세:', {
                message: error.message,
                name: error.name,
                code: error.code
            });
            alert('진료기록 저장 중 오류가 발생했습니다.');
        }
        setLoading(false);
    };

    if (!isDoctor) {
        return (
            <div className="patient-lookup">
                <div style={{ 
                    background: '#ffebee', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    border: '2px solid #f44336',
                    textAlign: 'center' 
                }}>
                    <h3 style={{ color: '#d32f2f' }}>🚫 접근 권한이 없습니다</h3>
                    <p>이 기능은 <strong>의사만</strong> 사용할 수 있습니다.</p>
                    <p>의사로 등록된 계정으로 로그인해주세요.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="patient-lookup">
            <h3>👨‍⚕️ 환자 조회 및 진료기록 작성</h3>
            
            <div className="lookup-section">
                <div className="input-group">
                    <label>환자 주소:</label>
                    <input
                        type="text"
                        value={patientAddress}
                        onChange={(e) => setPatientAddress(e.target.value)}
                        placeholder="0x..."
                        className="address-input"
                    />
                    <button 
                        onClick={handlePatientLookup}
                        disabled={loading || !patientAddress}
                        className="lookup-button"
                    >
                        {loading ? '조회 중...' : '환자 조회'}
                    </button>
                </div>
            </div>

            {patientFound === 'not_registered' && (
                <div className="patient-status not-registered">
                    <h4>❌ 등록되지 않은 환자</h4>
                    <p>해당 주소의 환자는 공개키가 등록되지 않았습니다.</p>
                </div>
            )}

            {patientFound === 'new' && (
                <div className="patient-status new-patient">
                    <h4>👤 새 환자 등록</h4>
                    <p>처음 등록하는 환자입니다. 기본정보를 포함한 진료기록을 작성해주세요.</p>
                    
                    <div className="medical-record-form">
                        <h5>기본정보</h5>
                        <div className="form-row">
                            <input
                                type="text"
                                placeholder="이름"
                                value={medicalRecordForm.name}
                                onChange={(e) => setMedicalRecordForm({
                                    ...medicalRecordForm,
                                    name: e.target.value
                                })}
                            />
                            <input
                                type="text"
                                placeholder="키 (cm)"
                                value={medicalRecordForm.height}
                                onChange={(e) => setMedicalRecordForm({
                                    ...medicalRecordForm,
                                    height: e.target.value
                                })}
                            />
                            <input
                                type="text"
                                placeholder="몸무게 (kg)"
                                value={medicalRecordForm.weight}
                                onChange={(e) => setMedicalRecordForm({
                                    ...medicalRecordForm,
                                    weight: e.target.value
                                })}
                            />
                        </div>
                        <div className="form-row">
                            <select
                                value={medicalRecordForm.bloodType}
                                onChange={(e) => setMedicalRecordForm({
                                    ...medicalRecordForm,
                                    bloodType: e.target.value
                                })}
                            >
                                <option value="">혈액형 선택</option>
                                <option value="A">A형</option>
                                <option value="B">B형</option>
                                <option value="AB">AB형</option>
                                <option value="O">O형</option>
                            </select>
                            <input
                                type="password"
                                placeholder="주민번호"
                                value={medicalRecordForm.ssn}
                                onChange={(e) => setMedicalRecordForm({
                                    ...medicalRecordForm,
                                    ssn: e.target.value
                                })}
                            />
                        </div>
                    </div>
                </div>
            )}

            {patientFound === 'existing' && patientInfo && (
                <div className="patient-status existing-patient">
                    <h4>📋 기존 환자</h4>
                    <p>환자 이름: {patientInfo.name}</p>
                    <p>진료기록을 추가해주세요.</p>
                </div>
            )}

            {(patientFound === 'new' || patientFound === 'existing') && (
                <div className="medical-record-form">
                    <div style={{ 
                        background: '#e3f2fd', 
                        padding: '15px', 
                        borderRadius: '8px', 
                        marginBottom: '20px',
                        border: '1px solid #2196f3'
                    }}>
                        <h5 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>📝 진료기록 작성</h5>
                        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                            모든 정보는 AES-256 암호화되어 저장되며, 의사와 환자만 복호화할 수 있습니다.
                        </p>
                    </div>
                    
                    <div className="form-column">
                        <div className="form-field">
                            <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                                🤒 주요 증상 *
                            </label>
                            <textarea
                                placeholder="환자가 호소하는 주요 증상을 상세히 기록해주세요..."
                                value={medicalRecordForm.symptoms}
                                onChange={(e) => setMedicalRecordForm({
                                    ...medicalRecordForm,
                                    symptoms: e.target.value
                                })}
                                rows={3}
                                required
                                style={{ width: '100%', minHeight: '80px' }}
                            />
                        </div>
                        
                        <div className="form-field">
                            <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                                🩺 진단 결과 *
                            </label>
                            <textarea
                                placeholder="진단명 및 진단 근거를 기록해주세요..."
                                value={medicalRecordForm.diagnosis}
                                onChange={(e) => setMedicalRecordForm({
                                    ...medicalRecordForm,
                                    diagnosis: e.target.value
                                })}
                                rows={3}
                                required
                                style={{ width: '100%', minHeight: '80px' }}
                            />
                        </div>
                        
                        <div className="form-field">
                            <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                                🏥 치료 계획
                            </label>
                            <textarea
                                placeholder="치료 방법, 시술 내용, 후속 치료 계획 등..."
                                value={medicalRecordForm.treatment}
                                onChange={(e) => setMedicalRecordForm({
                                    ...medicalRecordForm,
                                    treatment: e.target.value
                                })}
                                rows={3}
                                style={{ width: '100%', minHeight: '80px' }}
                            />
                        </div>
                        
                        <div className="form-field">
                            <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                                💊 처방전
                            </label>
                            <textarea
                                placeholder="처방약물명, 용법, 용량, 복용기간 등..."
                                value={medicalRecordForm.prescription}
                                onChange={(e) => setMedicalRecordForm({
                                    ...medicalRecordForm,
                                    prescription: e.target.value
                                })}
                                rows={3}
                                style={{ width: '100%', minHeight: '80px' }}
                            />
                        </div>
                        
                        <div className="form-field">
                            <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                                📋 추가 메모
                            </label>
                            <textarea
                                placeholder="환자 특이사항, 주의사항, 다음 진료 예약 등..."
                                value={medicalRecordForm.notes}
                                onChange={(e) => setMedicalRecordForm({
                                    ...medicalRecordForm,
                                    notes: e.target.value
                                })}
                                rows={2}
                                style={{ width: '100%', minHeight: '60px' }}
                            />
                        </div>
                    </div>
                    
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                        <button 
                            onClick={handleSubmitMedicalRecord}
                            disabled={loading || !medicalRecordForm.symptoms || !medicalRecordForm.diagnosis}
                            className="submit-button"
                            style={{
                                width: '100%',
                                padding: '15px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                background: (!medicalRecordForm.symptoms || !medicalRecordForm.diagnosis) 
                                    ? '#ccc' 
                                    : 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: (!medicalRecordForm.symptoms || !medicalRecordForm.diagnosis) 
                                    ? 'not-allowed' 
                                    : 'pointer'
                            }}
                        >
                            {loading ? '🔐 암호화 및 저장 중...' : '🔒 암호화하여 진료기록 저장'}
                        </button>
                        
                        {(!medicalRecordForm.symptoms || !medicalRecordForm.diagnosis) && (
                            <p style={{ 
                                color: '#f44336', 
                                fontSize: '14px', 
                                marginTop: '10px',
                                textAlign: 'center' 
                            }}>
                                * 증상과 진단은 필수 항목입니다.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientLookup; 