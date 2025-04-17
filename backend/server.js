const express = require('express');
// mongoose 제거
// const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const zkProofRoutes = require('./routes/zkProofRoutes');
const medicalRoutes = require('./routes/medicalRoutes');
const requestRoutes = require('./routes/requestRoutes');
const config = require('./config');
// dotenv 로드 (환경 변수 설정)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 환경변수 확인
console.log(`서버 포트: ${config.PORT}`);
console.log(`NODE_ENV: ${config.NODE_ENV}`);
console.log(`RPC URL: ${config.RPC_URL}`);

const app = express();

// 미들웨어
app.use(cors({
  origin: '*', // 모든 출처 허용 (개발 환경에서만 사용)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// 정적 파일 제공
if (config.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// 데이터베이스 연결 코드 제거
// mongoose.connect(config.DB_URI)
//   .then(() => console.log('MongoDB 연결 성공'))
//   .catch(err => {
//     console.error('MongoDB 연결 실패:', err);
//     process.exit(1);
//   });

// 라우트
app.use('/api/proofs', zkProofRoutes);
app.use('/api/medical-records', medicalRoutes);
app.use('/api/requests', requestRoutes);

// 기본 라우트
app.get('/api', (req, res) => {
  res.json({
    message: 'Zkare API 서버',
    version: '1.0.0',
    endpoints: {
      proofs: '/api/proofs',
      medicalRecords: '/api/medical-records',
      requests: '/api/requests'
    }
  });
});

// 프로덕션 환경에서 React 앱 제공
if (config.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '서버 오류가 발생했습니다.',
    error: config.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 서버 시작
const PORT = config.PORT || 5001;
app.listen(PORT, () => console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`));

module.exports = app; 