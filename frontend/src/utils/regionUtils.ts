export const REGION_MAPPING: Record<string, string> = {
  "Seoul": "서울특별시",
  "Busan": "부산광역시",
  "Incheon": "인천광역시",
  "Daegu": "대구광역시",
  "Daejeon": "대전광역시",
  "Gwangju": "광주광역시",
  "Ulsan": "울산광역시",
  "Sejong": "세종특별자치시",
  "Gyeonggi-do": "경기도",
  "Gangwon-do": "강원특별자치도",
  "Chungcheongbuk-do": "충청북도",
  "Chungcheongnam-do": "충청남도",
  "Jeollabuk-do": "전라북도",
  "Jeollanam-do": "전라남도",
  "Gyeongsangbuk-do": "경상북도",
  "Gyeongsangnam-do": "경상남도",
  "Jeju-do": "제주특별자치도",
  "South_Gyeongsang": "경상남도",
  'North_Gyeongsang': '경상북도',
  'South_Chungcheong': '충청남도',
  'North_Jeolla': '전라북도',
  'South_Jeolla': '전라남도',
  'North_Chungcheong': '충청북도',
  'Jeju': '제주특별자치도',
  'Gyeonggi': '경기도',
  'Gangwon': '강원특별자치도'
};

// 지역명 정규화 함수
export const normalizeRegionName = (regionName: string): string => {
  if (!regionName || regionName.trim() === '') {
    return '기타';
  }
  
  const trimmedName = regionName.trim();
  
  // 직접 매핑이 있는 경우
  if (REGION_MAPPING[trimmedName]) {
    return REGION_MAPPING[trimmedName];
  }
  
  // 대소문자 무시하고 찾기
  const lowerName = trimmedName.toLowerCase();
  for (const [key, value] of Object.entries(REGION_MAPPING)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // 매핑이 없으면 원래 이름 반환
  return trimmedName;
};

// 지역 데이터 정규화 함수
export const normalizeRegionData = <T extends { location: string }>(
  data: T[]
): T[] => {
  return data.map(item => ({
    ...item,
    location: normalizeRegionName(item.location)
  }));
};

// 지역별 집계 함수 (같은 한글명으로 병합)
export const aggregateRegionData = <T extends { location: string; users: number }>(
  data: T[]
): T[] => {
  const regionMap = new Map<string, T>();
  
  data.forEach(item => {
    const normalizedLocation = normalizeRegionName(item.location);
    
    if (regionMap.has(normalizedLocation)) {
      const existing = regionMap.get(normalizedLocation)!;
      regionMap.set(normalizedLocation, {
        ...existing,
        users: existing.users + item.users
      });
    } else {
      regionMap.set(normalizedLocation, {
        ...item,
        location: normalizedLocation
      });
    }
  });
  
  return Array.from(regionMap.values()).sort((a, b) => b.users - a.users);
}; 