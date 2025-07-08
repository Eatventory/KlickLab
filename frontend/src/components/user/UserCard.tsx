import React from 'react';
import { User, MapPin, Smartphone, Calendar, Share2 } from 'lucide-react';
import type { UserSegmentClickData } from '../../data/mockData';

interface UserCardProps {
  user: UserSegmentClickData;
  rank: number;
}

const getGenderIcon = (gender: string) => {
  switch (gender) {
    case 'male':
      return '👨';
    case 'female':
      return '👩';
    default:
      return '👤';
  }
};

const getAgeGroupLabel = (ageGroup: string) => {
  switch (ageGroup) {
    case '10s':
      return '10대';
    case '20s':
      return '20대';
    case '30s':
      return '30대';
    case '40s':
      return '40대';
    case '50s':
      return '50대';
    case '60s+':
      return '60대+';
    default:
      return ageGroup;
  }
};

const getSignupPathLabel = (signupPath: string) => {
  switch (signupPath) {
    case 'google':
      return 'Google';
    case 'facebook':
      return 'Facebook';
    case 'email':
      return '이메일';
    case 'kakao':
      return '카카오';
    case 'naver':
      return '네이버';
    case 'instagram':
      return 'Instagram';
    case 'direct':
      return '직접 가입';
    default:
      return signupPath;
  }
};

const getDeviceLabel = (device: string) => {
  switch (device) {
    case 'mobile':
      return '모바일';
    case 'desktop':
      return '데스크탑';
    case 'tablet':
      return '태블릿';
    default:
      return device;
  }
};

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    case 2:
      return 'bg-gray-100 border-gray-300 text-gray-800';
    case 3:
      return 'bg-orange-100 border-orange-300 text-orange-800';
    default:
      return 'bg-blue-100 border-blue-300 text-blue-800';
  }
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return `${rank}`;
  }
};

export const UserCard: React.FC<UserCardProps> = ({ user, rank }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* 랭킹 배지 */}
      <div className="flex items-center justify-between mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRankColor(rank)}`}>
          <span className="mr-1">{getRankIcon(rank)}</span>
          {rank}위
        </div>
        <div className="text-sm text-gray-500">
          총 {user.clickCount.toLocaleString()}회 클릭
        </div>
      </div>

      {/* 사용자 기본 정보 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full">
          <User className="w-6 h-6 text-gray-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getGenderIcon(user.gender)}</span>
            <span className="font-semibold text-gray-900">{user.userId}</span>
          </div>
          <div className="text-sm text-gray-600">
            {getAgeGroupLabel(user.ageGroup)} • {user.region}
          </div>
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{user.region}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Smartphone className="w-4 h-4" />
          <span>{getDeviceLabel(user.device)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{getAgeGroupLabel(user.ageGroup)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Share2 className="w-4 h-4" />
          <span>{getSignupPathLabel(user.signupPath)}</span>
        </div>
      </div>

      {/* 클릭 통계 */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-sm font-medium text-gray-900 mb-2">클릭 패턴</div>
        <div className="space-y-2">
          {user.topElements.map((element, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 truncate flex-1">{element.element}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{element.clicks}회</span>
                <span className="text-blue-600 font-medium">{element.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 