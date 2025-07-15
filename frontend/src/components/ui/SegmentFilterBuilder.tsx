import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useSegmentFilter } from '../../context/SegmentFilterContext';
import type { SegmentFilter } from '../../context/SegmentFilterContext';

export const SegmentFilterBuilder: React.FC = () => {
  const { filter, setFilter } = useSegmentFilter();
  const [isOpen, setIsOpen] = useState(false);

  // 필터 조건 업데이트
  const updateCondition = (key: string, value: any) => {
    setFilter((prev: SegmentFilter) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [key]: value
      }
    }));
  };

  // 필터 조건 제거
  const removeCondition = (key: string) => {
    setFilter((prev: SegmentFilter) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [key]: undefined
      }
    }));
  };

  // 현재 활성화된 조건들
  const activeConditions = Object.entries(filter.conditions || {}).filter(([_, value]) => value !== undefined);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">세그먼트 필터 설정</h3>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {isOpen ? '접기' : '필터 설정'}
        </button>
      </div>

      {/* 현재 활성 필터 표시 */}
      {activeConditions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">활성 필터:</h4>
          <div className="flex flex-wrap gap-2">
            {activeConditions.map(([key, value]) => (
              <div
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                <span>{getConditionLabel(key, value)}</span>
                <button
                  onClick={() => removeCondition(key)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 필터 설정 패널 */}
      {isOpen && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          {/* 세그먼트 타입 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              세그먼트 타입
            </label>
            <select
              value={filter.conditions?.segment || ''}
              onChange={(e) => updateCondition('segment', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체</option>
              <option value="converted">전환 사용자</option>
              <option value="abandoned_cart">장바구니 이탈</option>
              <option value="high_value">고가치 사용자</option>
              <option value="low_engagement">낮은 참여도</option>
            </select>
          </div>

          {/* 기기 타입 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              기기 타입
            </label>
            <select
              value={filter.conditions?.device || ''}
              onChange={(e) => updateCondition('device', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체</option>
              <option value="mobile">모바일</option>
              <option value="desktop">데스크탑</option>
              <option value="tablet">태블릿</option>
            </select>
          </div>

          {/* 사용자 타입 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사용자 타입
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filter.conditions?.isNew || false}
                  onChange={(e) => updateCondition('isNew', e.target.checked || undefined)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">신규 사용자</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filter.conditions?.isReturning || false}
                  onChange={(e) => updateCondition('isReturning', e.target.checked || undefined)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">재방문 사용자</span>
              </label>
            </div>
          </div>

          {/* 추가 조건들 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              추가 조건
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 성별 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">성별</label>
                <select
                  value={filter.conditions?.gender || ''}
                  onChange={(e) => updateCondition('gender', e.target.value || undefined)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">전체</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                </select>
              </div>

              {/* 연령대 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">연령대</label>
                <select
                  value={filter.conditions?.ageGroup || ''}
                  onChange={(e) => updateCondition('ageGroup', e.target.value || undefined)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">전체</option>
                  <option value="10s">10대</option>
                  <option value="20s">20대</option>
                  <option value="30s">30대</option>
                  <option value="40s">40대</option>
                  <option value="50s">50대</option>
                  <option value="60s+">60대 이상</option>
                </select>
              </div>

              {/* 지역 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">지역</label>
                <select
                  value={filter.conditions?.region || ''}
                  onChange={(e) => updateCondition('region', e.target.value || undefined)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">전체</option>
                  <option value="seoul">서울</option>
                  <option value="gyeonggi">경기</option>
                  <option value="incheon">인천</option>
                  <option value="busan">부산</option>
                  <option value="daegu">대구</option>
                  <option value="daejeon">대전</option>
                  <option value="gwangju">광주</option>
                  <option value="ulsan">울산</option>
                  <option value="sejong">세종</option>
                  <option value="gangwon">강원</option>
                  <option value="chungbuk">충북</option>
                  <option value="chungnam">충남</option>
                  <option value="jeonbuk">전북</option>
                  <option value="jeonnam">전남</option>
                  <option value="gyeongbuk">경북</option>
                  <option value="gyeongnam">경남</option>
                  <option value="jeju">제주</option>
                </select>
              </div>

              {/* 트래픽 소스 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">트래픽 소스</label>
                <select
                  value={filter.conditions?.trafficSource || ''}
                  onChange={(e) => updateCondition('trafficSource', e.target.value || undefined)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">전체</option>
                  <option value="direct">직접 방문</option>
                  <option value="organic">검색 엔진</option>
                  <option value="social">소셜 미디어</option>
                  <option value="referral">리퍼럴</option>
                  <option value="email">이메일</option>
                  <option value="paid">유료 광고</option>
                </select>
              </div>
            </div>
          </div>

          {/* 필터 초기화 버튼 */}
          {activeConditions.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={() => setFilter((prev: SegmentFilter) => ({ ...prev, conditions: {} }))}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                모든 필터 초기화
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 조건 라벨 생성 함수
function getConditionLabel(key: string, value: any): string {
  const labels: Record<string, Record<string, string>> = {
    segment: {
      converted: '전환',
      abandoned_cart: '이탈',
      high_value: '고가치',
      low_engagement: '낮은 참여도'
    },
    device: {
      mobile: '모바일',
      desktop: '데스크탑',
      tablet: '태블릿'
    },
    gender: {
      male: '남성',
      female: '여성'
    },
    ageGroup: {
      '10s': '10대',
      '20s': '20대',
      '30s': '30대',
      '40s': '40대',
      '50s': '50대',
      '60s+': '60대+'
    },
    region: {
      seoul: '서울',
      gyeonggi: '경기',
      incheon: '인천',
      busan: '부산',
      daegu: '대구',
      daejeon: '대전',
      gwangju: '광주',
      ulsan: '울산',
      sejong: '세종',
      gangwon: '강원',
      chungbuk: '충북',
      chungnam: '충남',
      jeonbuk: '전북',
      jeonnam: '전남',
      gyeongbuk: '경북',
      gyeongnam: '경남',
      jeju: '제주'
    },
    trafficSource: {
      direct: '직접 방문',
      organic: '검색 엔진',
      social: '소셜 미디어',
      referral: '리퍼럴',
      email: '이메일',
      paid: '유료 광고'
    }
  };

  if (key === 'isNew' && value) return '신규';
  if (key === 'isReturning' && value) return '재방문';

  return labels[key]?.[value] || `${key}: ${value}`;
} 