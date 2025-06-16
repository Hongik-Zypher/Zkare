import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { generateKeyPair } from '../utils/encryption';

const KeyGeneration = ({ keyRegistryContract, currentAccount }) => {
    const [loading, setLoading] = useState(false);
    const [keyPair, setKeyPair] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [userType, setUserType] = useState('patient'); // 'patient' or 'doctor'

    // 공개키 등록 여부 확인
    useEffect(() => {
        checkRegistrationStatus();
    }, [currentAccount, keyRegistryContract]);

    const checkRegistrationStatus = async () => {
        if (!keyRegistryContract || !currentAccount) return;
        
        try {
            const registered = await keyRegistryContract.isPublicKeyRegistered(currentAccount);
            setIsRegistered(registered);
        } catch (error) {
            console.error('등록 상태 확인 오류:', error);
        }
    };

    const handleGenerateKeys = async () => {
        setLoading(true);
        try {
            const keys = await generateKeyPair();
            setKeyPair(keys);
            
            // 브라우저 로컬스토리지에 개인키 저장 (실제 운영에서는 더 안전한 방법 사용)
            localStorage.setItem(`privateKey_${currentAccount}`, keys.privateKey);
            
            alert('키 생성이 완료되었습니다! 개인키는 안전하게 보관해주세요.');
        } catch (error) {
            console.error('키 생성 오류:', error);
            alert('키 생성 중 오류가 발생했습니다.');
        }
        setLoading(false);
    };

    const handleRegisterPublicKey = async () => {
        if (!keyPair || !keyRegistryContract) return;
        
        setLoading(true);
        try {
            const isDoctor = userType === 'doctor';
            const tx = await keyRegistryContract.registerPublicKey(keyPair.publicKey, isDoctor);
            await tx.wait();
            
            alert('공개키 등록이 완료되었습니다!');
            setIsRegistered(true);
        } catch (error) {
            console.error('공개키 등록 오류:', error);
            alert('공개키 등록 중 오류가 발생했습니다.');
        }
        setLoading(false);
    };

    const downloadPrivateKey = () => {
        if (!keyPair) return;
        
        const element = document.createElement('a');
        const file = new Blob([keyPair.privateKey], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `private_key_${currentAccount.slice(0, 10)}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    if (isRegistered) {
        return (
            <div className="key-generation">
                <h3>✅ 공개키가 등록되었습니다</h3>
                <p>귀하의 공개키는 이미 블록체인에 등록되어 있습니다.</p>
            </div>
        );
    }

    return (
        <div className="key-generation">
            <h3>🔐 암호화 키 생성 및 등록</h3>
            
            <div className="user-type-selection">
                <label>
                    <input
                        type="radio"
                        value="patient"
                        checked={userType === 'patient'}
                        onChange={(e) => setUserType(e.target.value)}
                    />
                    환자
                </label>
                <label>
                    <input
                        type="radio"
                        value="doctor"
                        checked={userType === 'doctor'}
                        onChange={(e) => setUserType(e.target.value)}
                    />
                    의사
                </label>
            </div>

            {!keyPair ? (
                <div>
                    <p>먼저 암호화에 사용할 키 쌍을 생성해주세요.</p>
                    <button 
                        onClick={handleGenerateKeys} 
                        disabled={loading}
                        className="generate-button"
                    >
                        {loading ? '생성 중...' : '키 생성'}
                    </button>
                </div>
            ) : (
                <div>
                    <h4>키 생성 완료!</h4>
                    <div className="key-info">
                        <h5>공개키 (블록체인에 등록됨):</h5>
                        <textarea 
                            value={keyPair.publicKey} 
                            readOnly 
                            rows={8}
                            className="key-textarea"
                        />
                        
                        <h5>개인키 (안전하게 보관하세요!):</h5>
                        <div className="private-key-section">
                            <button onClick={downloadPrivateKey} className="download-button">
                                개인키 다운로드
                            </button>
                            <p className="warning">
                                ⚠️ 개인키는 절대 타인에게 공개하지 마세요!
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleRegisterPublicKey} 
                        disabled={loading}
                        className="register-button"
                    >
                        {loading ? '등록 중...' : '공개키 등록'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default KeyGeneration; 