// 전문적인 병원 디자인 시스템 색상 상수
export const COLORS = {
  // 배경 - 깔끔한 흰색과 연한 회색
  background: '#FAFBFC',
  cardBg: '#FFFFFF',
  primaryBg: '#F0F7FF',
  
  // 주요 색상 - 전문적인 청록색 계열
  primary: '#0891B2', // Cyan 600 - 병원에서 자주 쓰는 신뢰감 있는 색상
  primaryHover: '#0E7490', // Cyan 700
  primaryLight: '#06B6D4', // Cyan 500
  primaryDark: '#155E75', // Cyan 800
  
  // 보조 색상
  secondary: '#64748B', // Slate 500
  secondaryLight: '#94A3B8', // Slate 400
  secondaryDark: '#475569', // Slate 600
  
  // 경고
  warningBg: '#FEF3C7',
  warningText: '#D97706',
  warningBorder: '#F59E0B',
  
  // 상태 색상 - 명확한 구분
  success: '#059669', // Emerald 600
  successBg: '#D1FAE5',
  error: '#DC2626', // Red 600
  errorBg: '#FEE2E2',
  info: '#0284C7', // Sky 600
  infoBg: '#E0F2FE',
  
  // 텍스트 - 높은 대비
  textPrimary: '#0F172A', // Slate 900 - 매우 진한 회색
  textSecondary: '#475569', // Slate 600
  textTertiary: '#64748B', // Slate 500
  textInverse: '#FFFFFF',
  
  // 구분선 - 명확한 구분
  border: '#CBD5E1', // Slate 300
  borderLight: '#E2E8F0', // Slate 200
  borderDark: '#94A3B8', // Slate 400
  divider: '#E2E8F0', // Slate 200
  
  // 역할별 색상 - 전문적인 톤
  roleDoctor: '#E0F2FE', // Sky 100
  rolePatient: '#D1FAE5', // Emerald 100
  roleMaster: '#EDE9FE', // Violet 100
  
  // 그라데이션
  gradientPrimary: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
  gradientSecondary: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
  gradientSuccess: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
};

// 간격 상수
export const SPACING = {
  pagePadding: '24px',
  cardGap: '16px',
  sectionGap: '48px',
};

// 폰트
export const FONTS = {
  primary: 'Inter, Noto Sans KR, sans-serif',
};

// 역할 매핑
export const ROLE_CONFIG = {
  doctor: {
    label: '👨‍⚕️ 의사',
    bgColor: COLORS.roleDoctor,
    textColor: COLORS.primary,
  },
  patient: {
    label: '👤 환자',
    bgColor: COLORS.rolePatient,
    textColor: COLORS.success,
  },
  master: {
    label: '🔑 마스터 계정',
    bgColor: COLORS.roleMaster,
    textColor: '#7C3AED',
  },
};

