import React, { useState } from 'react';

interface GenderData {
  id: string;
  name: string;
  users: number;
  percentage: number;
  color: string;
}

export const GenderActiveUsers: React.FC = () => {
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [hoveredGender, setHoveredGender] = useState<string | null>(null);

  // 성별별 사용자 데이터
  const genderData: GenderData[] = [
    { id: 'male', name: '남성', users: 267000, percentage: 58.04, color: '#3b82f6' },
    { id: 'female', name: '여성', users: 175000, percentage: 38.04, color: '#ec4899' },
    { id: 'unknown', name: '알 수 없음', users: 18000, percentage: 3.91, color: '#6b7280' }
  ];

  const totalUsers = genderData.reduce((sum, gender) => sum + gender.users, 0);

  const handleGenderClick = (genderId: string) => {
    setSelectedGender(selectedGender === genderId ? null : genderId);
  };

  const handleGenderHover = (genderId: string) => {
    setHoveredGender(genderId);
  };

  const handleGenderLeave = () => {
    setHoveredGender(null);
  };

  const getGenderData = (genderId: string) => {
    return genderData.find(gender => gender.id === genderId);
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">성별 별 활성 사용자</h3>
      </div>

      {/* 총 사용자 수 */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm text-gray-500">총 사용자</span>
          <span className="text-sm text-green-600 font-medium">+2.8%</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {totalUsers.toLocaleString()}
        </div>
      </div>

      {/* 파이 차트 영역 */}
      <div className="flex justify-center mb-4">
        <div className="relative w-48 h-48">
          <svg width="192" height="192" viewBox="0 0 192 192" className="transform -rotate-90">
            {(() => {
              let cumulativePercentage = 0;
              return genderData.map((gender, index) => {
                const startAngle = (cumulativePercentage / 100) * 360;
                const endAngle = ((cumulativePercentage + gender.percentage) / 100) * 360;
                const largeArcFlag = gender.percentage > 50 ? 1 : 0;
                
                const startAngleRad = (startAngle * Math.PI) / 180;
                const endAngleRad = (endAngle * Math.PI) / 180;
                
                const x1 = 96 + 80 * Math.cos(startAngleRad);
                const y1 = 96 + 80 * Math.sin(startAngleRad);
                const x2 = 96 + 80 * Math.cos(endAngleRad);
                const y2 = 96 + 80 * Math.sin(endAngleRad);

                const pathData = [
                  `M 96 96`,
                  `L ${x1} ${y1}`,
                  `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  'Z'
                ].join(' ');

                cumulativePercentage += gender.percentage;

                return (
                  <path
                    key={gender.id}
                    d={pathData}
                    fill={gender.color}
                    stroke="white"
                    strokeWidth="2"
                    className={`cursor-pointer transition-opacity ${
                      selectedGender === gender.id ? 'opacity-100' : 
                      hoveredGender && hoveredGender !== gender.id ? 'opacity-60' : 'opacity-90'
                    } hover:opacity-100`}
                    onClick={() => handleGenderClick(gender.id)}
                    onMouseEnter={() => handleGenderHover(gender.id)}
                    onMouseLeave={handleGenderLeave}
                  />
                );
              });
            })()}
          </svg>
          
          {/* 중앙 텍스트 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl font-bold text-gray-900">
              {hoveredGender ? getGenderData(hoveredGender)?.percentage.toFixed(1) + '%' : '100%'}
            </div>
            <div className="text-xs text-gray-500">
              {hoveredGender ? getGenderData(hoveredGender)?.name : '전체'}
            </div>
          </div>
        </div>
      </div>

      {/* 범례 및 데이터 */}
      <div className="space-y-2">
        {genderData.map((gender) => (
          <div 
            key={gender.id}
            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
              selectedGender === gender.id ? 'bg-gray-50' : 'hover:bg-gray-25'
            }`}
            onClick={() => handleGenderClick(gender.id)}
            onMouseEnter={() => handleGenderHover(gender.id)}
            onMouseLeave={handleGenderLeave}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: gender.color }}
              />
              <span className="text-sm font-medium text-gray-900">
                {gender.name}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {gender.percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {gender.users.toLocaleString()}명
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 