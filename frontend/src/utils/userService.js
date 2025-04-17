import { getContracts, getCurrentAccount } from './contracts';

/**
 * 현재 계정이 의사인지 확인
 * @returns {Promise<boolean>} 의사 여부
 */
export const isDoctor = async () => {
  try {
    const { zkareContract } = await getContracts();
    const account = await getCurrentAccount();
    
    // 컨트랙트의 isDoctor 함수 호출
    const result = await zkareContract.isDoctor(account);
    console.log(`의사 상태 확인 결과: ${result}`);
    return result;
  } catch (error) {
    console.error('의사 확인 오류:', error);
    
    // 오류 발생 시 관리자 확인 시도 (백업 방법)
    try {
      const { zkareContract } = await getContracts();
      const account = await getCurrentAccount();
      const admin = await zkareContract.admin();
      
      if (admin && account.toLowerCase() === admin.toLowerCase()) {
        console.log('관리자 계정이므로 의사로 간주합니다.');
        return true;
      }
    } catch (adminError) {
      console.error('관리자 확인 오류:', adminError);
    }
    
    return false;
  }
};

/**
 * 현재 계정이 환자인지 확인
 * @returns {Promise<boolean>} 환자 여부
 */
export const isPatient = async () => {
  try {
    const { zkareContract } = await getContracts();
    const account = await getCurrentAccount();
    
    // 컨트랙트의 isPatient 함수 호출
    const result = await zkareContract.isPatient(account);
    return result;
  } catch (error) {
    console.error('환자 확인 오류:', error);
    return false;
  }
};

/**
 * 의사로 등록
 * @param {string} doctorAddress 의사로 등록할 주소 (지정하지 않으면 현재 계정)
 * @returns {Promise<Object>} 등록 결과
 */
export const registerDoctor = async (doctorAddress) => {
  try {
    const { zkareContract } = await getContracts();
    const targetAddress = doctorAddress || await getCurrentAccount();
    
    // 컨트랙트의 addDoctor 함수 호출
    const tx = await zkareContract.addDoctor(targetAddress);
    await tx.wait();
    
    console.log(`의사 등록 완료: ${targetAddress}`);
    
    return {
      success: true,
      message: '의사로 성공적으로 등록되었습니다.'
    };
  } catch (error) {
    console.error('의사 등록 오류:', error);
    return {
      success: false,
      message: `오류: ${error.message}`
    };
  }
};

/**
 * 환자로 등록
 * @param {string} patientAddress 환자로 등록할 주소 (지정하지 않으면 현재 계정)
 * @returns {Promise<Object>} 등록 결과
 */
export const registerPatient = async (patientAddress) => {
  try {
    const { zkareContract } = await getContracts();
    const account = patientAddress || await getCurrentAccount();
    
    // 이미 환자인지 확인
    let isAlreadyPatient = false;
    try {
      isAlreadyPatient = await zkareContract.isPatient(account);
    } catch (checkError) {
      console.warn('환자 상태 확인 오류:', checkError);
    }
    
    if (isAlreadyPatient) {
      return {
        success: true,
        message: '이미 환자로 등록되어 있습니다.'
      };
    }
    
    // 컨트랙트의 registerPatient 함수 호출
    // 현재 계정으로 직접 호출해야 하므로 다른 계정 지정 시 주의 필요
    const tx = await zkareContract.registerPatient();
    await tx.wait();
    
    console.log(`환자 등록 완료: ${account}`);
    
    // 환자 등록 후 기본 의료 데이터(혈액형) 등록 시도
    try {
      // 의사인 경우, 기본 의료 데이터 등록 시도
      const isDocAccount = await zkareContract.isDoctor(await getCurrentAccount());
      if (isDocAccount) {
        const bloodTypeValue = 1; // A형을 기본값으로 설정
        // 의료 데이터 등록 함수가 있는지 확인
        if (typeof zkareContract.registerPatientData === 'function') {
          try {
            await zkareContract.registerPatientData(account, "bloodType", bloodTypeValue);
            console.log(`환자 기본 데이터 등록 (혈액형): ${account}`);
          } catch (dataErr) {
            console.warn('기본 데이터 등록 실패:', dataErr.message);
          }
        }
      }
    } catch (dataRegErr) {
      console.warn('추가 데이터 등록 시도 중 오류:', dataRegErr);
      // 기본 데이터 등록 실패는 무시하고 환자 등록 성공으로 처리
    }
    
    return {
      success: true,
      message: '환자로 성공적으로 등록되었습니다.'
    };
  } catch (error) {
    console.error('환자 등록 오류:', error);
    return {
      success: false,
      message: `오류: ${error.message}`
    };
  }
};

/**
 * 등록된 모든 의사 목록 조회
 * @returns {Promise<Array<string>>} 의사 주소 목록
 */
export const getAllDoctors = async () => {
  try {
    const { zkareContract } = await getContracts();
    const doctors = await zkareContract.getAllDoctors();
    console.log('의사 목록 불러오기 성공:', doctors.length, '명');
    return doctors;
  } catch (error) {
    console.error('의사 목록 조회 오류:', error);
    return [];
  }
};

/**
 * 등록된 모든 환자 목록 조회
 * @returns {Promise<Array<string>>} 환자 주소 목록
 */
export const getAllPatients = async () => {
  try {
    const { zkareContract } = await getContracts();
    const patients = await zkareContract.getAllPatients();
    console.log('환자 목록 불러오기 성공:', patients.length, '명');
    return patients;
  } catch (error) {
    console.error('환자 목록 조회 오류:', error);
    return [];
  }
};

/**
 * Home.js와 호환되는 의사 목록 형식으로 반환
 * @returns {Promise<Object>} 성공 여부와 의사 목록
 */
export const getDoctorsList = async () => {
  try {
    const doctors = await getAllDoctors();
    
    // 주소 배열을 객체 배열로 변환
    const formattedDoctors = doctors.map(address => ({
      address: address,
      isActive: true, // 컨트랙트의 getAllDoctors()는 활성 상태의 의사만 반환
    }));
    
    return {
      success: true,
      doctors: formattedDoctors,
      message: '의사 목록을 성공적으로 불러왔습니다.'
    };
  } catch (error) {
    console.error('의사 목록 조회 최종 오류:', error);
    return {
      success: false,
      doctors: [],
      message: `오류: ${error.message}`
    };
  }
};

/**
 * Home.js와 호환되는 환자 목록 형식으로 반환
 * @returns {Promise<Object>} 성공 여부와 환자 목록
 */
export const getPatientsList = async () => {
  try {
    const patients = await getAllPatients();
    const { zkareContract } = await getContracts();
    
    // 환자별 기록 수와 혈액형 정보를 조회하여 객체 배열로 변환
    const formattedPatients = await Promise.all(patients.map(async (address) => {
      let recordCount = 0;
      let bloodType = 0;
      
      try {
        // 환자별 기록 수 조회 시도 (관리자/의사 전용 함수 사용)
        recordCount = await zkareContract.getPatientRecordCountAdmin(address);
        
        // BigNumber인 경우에만 toNumber() 호출, 아니면 Number로 형변환
        if (recordCount && typeof recordCount.toNumber === 'function') {
          recordCount = recordCount.toNumber(); 
        } else {
          recordCount = Number(recordCount); // 일반 숫자로 변환
        }
        
        // 혈액형 정보 조회 시도
        try {
          // 의사 또는 환자 본인만 호출 가능
          const account = await getCurrentAccount();
          
          // 현재 계정이 환자 본인이거나 의사인 경우만 조회
          if (account.toLowerCase() === address.toLowerCase() || await zkareContract.isDoctor(account)) {
            const bloodTypeValue = await zkareContract.getPatientData(address, "bloodType");
            bloodType = Number(bloodTypeValue) || 0;
            console.log(`환자 ${address} 혈액형 조회 성공: ${bloodType}`);
          }
        } catch (btError) {
          console.warn(`${address} 환자의 혈액형 조회 실패:`, btError.message);
          // 오류 발생 시 기본값 0 사용 (혈액형 미등록)
        }
      } catch (e) {
        console.warn(`${address} 환자의 기록 수 조회 실패:`, e);
      }
      
      return {
        address: address,
        recordCount: recordCount,
        bloodType: bloodType  // 혈액형 정보 추가
      };
    }));
    
    return {
      success: true,
      patients: formattedPatients,
      message: '환자 목록을 성공적으로 불러왔습니다.'
    };
  } catch (error) {
    console.error('환자 목록 조회 최종 오류:', error);
    return {
      success: false,
      patients: [],
      message: `오류: ${error.message}`
    };
  }
}; 