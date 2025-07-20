import React, { useState, useEffect } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';
import { getRangeLabel } from '../../utils/getRangeLabel';

interface UserSegmentSummaryProps {
  refreshKey?: number;
  dateRange?: { startDate: Date; endDate: Date; key: string };
}

interface SegmentData {
  segmentValue: string;
  totalUsers: number;
  totalClicks: number;
  userDistribution: {
    ageGroup?: Record<string, number>;
    gender?: Record<string, number>;
    device?: Record<string, number>;
  };
}

export const UserSegmentSummary: React.FC<UserSegmentSummaryProps> = ({ refreshKey, dateRange }) => {
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    const generateSummary = async () => {
      try {
        const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
        if (!token) {
          setSummary('서비스의 <strong>핵심 사용자층</strong>은 <strong>20대 남성</strong>으로, 전체 사용자의 <strong>15.2%</strong>를 차지합니다.');
          return;
        }

        // 날짜 범위 쿼리 스트링 생성
        let dateQuery = '';
        if (dateRange) {
          const startStr = dayjs(dateRange.startDate).format('YYYY-MM-DD');
          const endStr = dayjs(dateRange.endDate).format('YYYY-MM-DD');
          dateQuery = `?startDate=${startStr}&endDate=${endStr}`;
        }
        
        // realtime-analytics API 호출
        const response = await fetch(`/api/users/realtime-analytics${dateQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();
        
        // 성별별 사용자 수 집계
        const genderMap: Record<string, number> = {};
        // 연령별 사용자 수 집계  
        const ageMap: Record<string, number> = {};
        
        result.data.forEach((row: any) => {
          const userCount = parseInt(row.user_count);
          
          if (row.segment_type === 'user_gender') {
            const gender = row.segment_value;
            if (gender && gender !== 'unknown') {
              genderMap[gender] = (genderMap[gender] || 0) + userCount;
            }
          }
          
          if (row.segment_type === 'user_age') {
            const age = row.segment_value;
            if (age && age !== 'unknown') {
              ageMap[age] = (ageMap[age] || 0) + userCount;
            }
          }
        });
        
        // DateRange 라벨 생성
        const rangeLabel = dateRange ? getRangeLabel(dateRange.startDate, dateRange.endDate) : '전체 기간';
        
        // 성별 분석: 1위와 2위 찾기
        const genderEntries = Object.entries(genderMap).sort(([,a], [,b]) => b - a);
        const topGender = genderEntries[0];
        const secondGender = genderEntries[1];
        
        // 연령대 분석: 1위와 비중 계산
        const ageEntries = Object.entries(ageMap).sort(([,a], [,b]) => b - a);
        const topAge = ageEntries[0];
        
        if (topGender && topAge && secondGender) {
          // 성별 라벨 변환
          const genderLabelMap: Record<string, string> = {
            'male': '남성',
            'female': '여성'
          };
          
          const topGenderLabel = genderLabelMap[topGender[0]] || '기타';
          const secondGenderLabel = genderLabelMap[secondGender[0]] || '기타';
          
          // 연령대 라벨 변환
          const ageLabelMap: Record<string, string> = {
            '10s': '10대',
            '20s': '20대', 
            '30s': '30대',
            '40s': '40대',
            '50s': '50대',
            '60s+': '60대 이상'
          };
          const topAgeLabel = ageLabelMap[topAge[0]] || topAge[0];
          
          // 전체 연령대 사용자 수 계산 (성별이 아닌 연령대 기준)
          const totalAgeUsers = Object.values(ageMap).reduce((sum, count) => sum + count, 0);
          const agePercentage = totalAgeUsers > 0 ? (topAge[1] / totalAgeUsers * 100).toFixed(1) : '0';

          const summaryText = `<strong>${rangeLabel}</strong> 서비스는 <strong>${topGenderLabel}</strong>이 <strong>${secondGenderLabel}</strong>보다 많이 사용하고 <strong>${topAgeLabel}(${agePercentage}%)</strong>가 많이 사용합니다.`;
          setSummary(summaryText);
        } else {
          setSummary('사용자 세그먼트 데이터를 분석 중입니다.');
        }
      } catch (error) {
        console.error('Failed to generate user segment summary:', error);
        setSummary('');
      }
    };
    
    generateSummary();
    
    // 30초마다 요약 갱신
    const interval = setInterval(generateSummary, 30000);
    return () => clearInterval(interval);
  }, [refreshKey, dateRange]);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-purple-900 mb-1">
            사용자 세그먼트 분석 요약
          </h3>
          <p 
            className="text-sm text-purple-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: summary || '사용자 세그먼트 데이터를 분석 중입니다.' }}
          />
        </div>
      </div>
    </div>
  );
}; 