import React, { useState } from 'react';
import { verifyBloodType } from '../utils/medicalVerificationService';

// 혈액형 코드와 이름 매핑
const BLOOD_TYPES = [
  { code: 1, name: 'A형' },
  { code: 2, name: 'B형' },
  { code: 3, name: 'AB형' },
  { code: 4, name: 'O형' }
];

/**
 * 혈액형 검증 요청 컴포넌트
 */
const VerificationRequest = () => {
  const [patientAddress, setPatientAddress] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState(1);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 혈액형 검증 요청 처리
  const handleVerificationRequest = async () => {
    if (!patientAddress || patientAddress.trim() === '') {
      setResult({
        success: false,
        message: '환자 주소를 입력해주세요.'
      });
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    
    try {
      // 검증 요청 전송
      const requestResult = await verifyBloodType(patientAddress, selectedBloodType);
      setResult(requestResult);
    } catch (error) {
      console.error('검증 요청 오류:', error);
      setResult({
        success: false,
        message: `오류가 발생했습니다: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">혈액형 검증 요청</h2>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">환자 지갑 주소</label>
        <input
          type="text"
          className="w-full px-4 py-2 border rounded-md"
          placeholder="0x..."
          value={patientAddress}
          onChange={(e) => setPatientAddress(e.target.value)}
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">추측하는 혈액형</label>
        <select
          className="w-full px-4 py-2 border rounded-md"
          value={selectedBloodType}
          onChange={(e) => setSelectedBloodType(Number(e.target.value))}
        >
          {BLOOD_TYPES.map((type) => (
            <option key={type.code} value={type.code}>
              {type.name}
            </option>
          ))}
        </select>
      </div>
      
      <button
        className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        disabled={isLoading || !patientAddress}
        onClick={handleVerificationRequest}
      >
        {isLoading ? '요청 중...' : '검증 요청하기'}
      </button>
      
      {result && (
        <div 
          className={`mt-4 p-4 rounded-md ${
            result.success ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <p className="font-bold">{result.message}</p>
          {result.success && result.requestId !== undefined && (
            <p className="mt-2">요청 ID: {result.requestId}</p>
          )}
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p>
          이 기능은 환자의 혈액형이 추측한 값과 일치하는지 검증을 요청합니다.
          요청 후에는 환자가 승인을 해야 검증이 진행됩니다.
        </p>
      </div>
    </div>
  );
};

export default VerificationRequest; 