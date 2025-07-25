// 나이를 연령대 그룹으로 변환하는 함수
export const convertAgeToGroup = (age: string | number): string => {
  if (!age || age === 'unknown' || age === '') {
    return 'unknown';
  }

  // 이미 그룹 형태인 경우 그대로 반환
  if (typeof age === 'string' && age.endsWith('s')) {
    return age;
  }

  // 숫자로 변환
  const numAge = typeof age === 'string' ? parseInt(age, 10) : age;
  
  // 유효하지 않은 나이
  if (isNaN(numAge) || numAge < 0 || numAge > 120) {
    return 'unknown';
  }

  // 연령대 구간별 매핑
  if (numAge >= 10 && numAge < 20) return '10s';
  if (numAge >= 20 && numAge < 30) return '20s';
  if (numAge >= 30 && numAge < 40) return '30s';
  if (numAge >= 40 && numAge < 50) return '40s';
  if (numAge >= 50 && numAge < 60) return '50s';
  if (numAge >= 60) return '60s+';
  
  // 10세 미만은 알 수 없음으로 처리
  return 'unknown';
};

// 연령대 라벨 매핑
export const AGE_GROUP_LABELS: Record<string, string> = {
  '10s': '10대',
  '20s': '20대', 
  '30s': '30대',
  '40s': '40대',
  '50s': '50대',
  '60s+': '60세 이상',
  'unknown': '알 수 없음'
};

// 연령대 순서
export const AGE_GROUP_ORDER = ['10s', '20s', '30s', '40s', '50s', '60s+', 'unknown']; 