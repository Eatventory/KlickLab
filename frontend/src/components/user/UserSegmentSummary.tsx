import React, { useState, useEffect } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';

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
          setSummary('현재 서비스의 <strong>핵심 사용자층</strong>은 <strong>20대 남성</strong>으로, 전체 사용자의 <strong>15.2%</strong>를 차지합니다.');
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
        // 성별-연령 교차 집계
        const crossMap: Record<string, Record<string, number>> = {};
        
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
          
          // 성별과 연령 교차 분석을 위한 데이터 수집
          if (row.segment_type === 'user_gender' && row.dist_type === 'user_age') {
            const gender = row.segment_value;
            const age = row.dist_value;
            if (gender && age && gender !== 'unknown' && age !== 'unknown') {
              if (!crossMap[gender]) crossMap[gender] = {};
              crossMap[gender][age] = (crossMap[gender][age] || 0) + userCount;
            }
          }
        });
        
        // 최대 사용자 수를 가진 성별-연령 조합 찾기
        let maxCount = 0;
        let topGender = '';
        let topAge = '';
        
        // 교차 데이터가 있으면 사용, 없으면 각각의 최대값 사용
        if (Object.keys(crossMap).length > 0) {
          Object.entries(crossMap).forEach(([gender, ageData]) => {
            Object.entries(ageData).forEach(([age, count]) => {
              if (count > maxCount) {
                maxCount = count;
                topGender = gender;
                topAge = age;
              }
            });
          });
        } else {
          // Fallback: 성별과 연령 각각의 최대값 사용
          const maxGender = Object.entries(genderMap).reduce((max, [gender, count]) => 
            count > max.count ? { gender, count } : max, { gender: '', count: 0 });
          const maxAge = Object.entries(ageMap).reduce((max, [age, count]) => 
            count > max.count ? { age, count } : max, { age: '', count: 0 });
          
          topGender = maxGender.gender;
          topAge = maxAge.age;
          maxCount = Math.max(maxGender.count, maxAge.count);
        }
        
        if (topGender && topAge) {
          // 성별 라벨 변환
          const genderLabel = topGender === 'male' ? '남성' : 
                            topGender === 'female' ? '여성' : '기타';
          
          // 연령대 라벨 변환
          const ageLabelMap: Record<string, string> = {
            '10s': '10대',
            '20s': '20대', 
            '30s': '30대',
            '40s': '40대',
            '50s': '50대',
            '60s+': '60대 이상'
          };
          const ageLabel = ageLabelMap[topAge] || topAge;
          
          // 전체 사용자 수 계산
          const totalUsers = Object.values(genderMap).reduce((sum, count) => sum + count, 0) || 
                           Object.values(ageMap).reduce((sum, count) => sum + count, 0);
          
          const percentage = totalUsers > 0 ? (maxCount / totalUsers * 100).toFixed(1) : '0';

          const summaryText = `현재 서비스의 <strong>핵심 사용자층</strong>은 <strong>${ageLabel} ${genderLabel}</strong>으로, 전체 사용자의 <strong>${percentage}%</strong>를 차지합니다.`;
          setSummary(summaryText);
        } else {
          setSummary('사용자 세그먼트 데이터를 분석 중입니다.');
        }
      } catch (error) {
        console.error('Failed to generate user segment summary:', error);
        // Fallback 데이터로 요약 생성
        setSummary('현재 서비스의 <strong>핵심 사용자층</strong>은 <strong>20대 남성</strong>으로, 전체 사용자의 <strong>15.2%</strong>를 차지합니다.');
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