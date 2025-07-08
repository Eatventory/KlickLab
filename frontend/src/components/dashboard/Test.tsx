import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, Trophy, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { TestFilterTabs } from './TestFilterTabs';

// 랭킹 데이터 타입
interface RankingItem {
  rank: number;
  name: string;
  value: number;
  change: number;
  icon: string;
}

// 차트 데이터 타입
interface ChartData {
  label: string;
  value: number;
  color: string;
}

const Test: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    mainCategory: 'all' as 'all' | 'mobile' | 'desktop',
    subCategory: 'all' as 'all' | 'ios' | 'android' | 'macos' | 'windows'
  });

  // 필터 변경 핸들러
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // 막대그래프 데이터
  const [barChartData, setBarChartData] = useState([
    { label: 'button 1', value: 0, color: '#EF4444' },
    { label: 'button 2', value: 0, color: '#3B82F6' },
    { label: 'button 3', value: 0, color: '#10B981' },
    { label: 'button 4', value: 0, color: '#F59E0B' },
    { label: 'button 5', value: 0, color: '#8B5CF6' },
    { label: 'button 6', value: 0, color: '#EC4899' },
    { label: 'button 7', value: 0, color: '#06B6D4' }
  ]);

  // 파이차트 데이터 - 버튼별 클릭 비율 (동일한 점유율)
  const [pieChartData, setPieChartData] = useState<ChartData[]>([
    { label: 'button 1', value: 14.3, color: '#EF4444' },
    { label: 'button 2', value: 14.3, color: '#3B82F6' },
    { label: 'button 3', value: 14.3, color: '#10B981' },
    { label: 'button 4', value: 14.3, color: '#F59E0B' },
    { label: 'button 5', value: 14.3, color: '#8B5CF6' },
    { label: 'button 6', value: 14.3, color: '#EC4899' },
    { label: 'button 7', value: 14.3, color: '#06B6D4' },
  ]);

  // 랭킹 데이터 - 버튼 클릭 랭킹 (모두 0)
  const [rankingData, setRankingData] = useState<RankingItem[]>([
    {
      rank: 1,
      name: 'button 1',
      value: 0,
      change: 0,
      icon: '🔴'
    },
    {
      rank: 2,
      name: 'button 2',
      value: 0,
      change: 0,
      icon: '🔵'
    },
    {
      rank: 3,
      name: 'button 3',
      value: 0,
      change: 0,
      icon: '🟢'
    }
  ]);

  // 외부 데이터 수신 시뮬레이션 (실제로는 WebSocket이나 API 호출)
  const simulateExternalData = (buttonIndex: number) => {
    // 막대그래프 업데이트
    setBarChartData(prev => prev.map((item, index) => 
      index === buttonIndex 
        ? { ...item, value: item.value + Math.floor(Math.random() * 100) + 50 }
        : item
    ));

    // 파이차트 업데이트 (전체 비율 재계산)
    setTimeout(() => {
      setBarChartData(currentBarData => {
        const totalClicks = currentBarData.reduce((sum, item) => sum + item.value, 0);
        const newPieData = currentBarData.map((item, index) => ({
          label: item.label,
          value: Math.round((item.value / totalClicks) * 100),
          color: pieChartData[index]?.color || '#3B82F6'
        }));
        setPieChartData(newPieData);
        return currentBarData;
      });
    }, 100);

    // 랭킹 업데이트
    setTimeout(() => {
      setBarChartData(currentBarData => {
        const sortedButtons = [...currentBarData]
          .map((item, index) => ({ ...item, index }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 3);

        const newRankingData = sortedButtons.map((item, rankIndex) => ({
          rank: rankIndex + 1,
          name: item.label,
          value: item.value,
          change: Math.random() > 0.5 ? Math.random() * 15 : -Math.random() * 10,
          icon: ['🔴', '🔵', '🟢'][rankIndex]
        }));

        setRankingData(newRankingData);
        return currentBarData;
      });
    }, 200);
  };

  // 외부 연결 시뮬레이션
  useEffect(() => {
    // 실제 API 연결 (배포된 버튼 페이지에서 데이터 수신)
    const pollData = async () => {
      try {
        // 필터에 따라 다른 API 엔드포인트 호출
        let apiUrl = `/api/button-clicks`;
        
        if (filters.mainCategory !== 'all') {
          if (filters.subCategory === 'all') {
            // 카테고리 전체 (모바일 전체, 데스크탑 전체)
            apiUrl = `/api/button-clicks?platform=${filters.mainCategory}`;
          } else {
            // 특정 플랫폼
            apiUrl = `/api/button-clicks?platform=${filters.subCategory}`;
          }
        }
        
        console.log('API 호출:', apiUrl);
        const response = await fetch(apiUrl);

        const data = await response.json();
        
        // SDK 방식: 각 버튼의 클릭 데이터를 받아옴
        if (data.buttonClicks) {
          // 예: { "button1": 5, "button2": 3, "button3": 8, ... }
          Object.entries(data.buttonClicks).forEach(([buttonId, clickCount]) => {
            const buttonIndex = parseInt(buttonId.replace('button', '')) - 1; // button1 -> 0, button2 -> 1
            if (buttonIndex >= 0 && buttonIndex < 7) {
              // 해당 버튼의 클릭 수를 업데이트
              setBarChartData(prev => prev.map((item, index) => 
                index === buttonIndex 
                  ? { ...item, value: Number(clickCount) }
                  : item
              ));
            }
          });
          
          // 파이차트와 랭킹도 업데이트
          updateChartsFromData(data.buttonClicks);
        }
        
        // 팀원 SDK 로그 형식에 맞는 처리 (element_path 기반)
        if (data.clickEvents) {
          // 예: [{ element_path: "button:nth-child(1)", ... }, { element_path: "button:nth-child(7)", ... }]
          const buttonCounts = {
            button1: 0, button2: 0, button3: 0, button4: 0, button5: 0, button6: 0, button7: 0
          };
          
          data.clickEvents.forEach((event: any) => {
            // element_path에서 버튼 번호 추출
            const match = event.element_path?.match(/button:nth-child\((\d+)\)/);
            if (match) {
              const buttonNumber = parseInt(match[1]);
              if (buttonNumber >= 1 && buttonNumber <= 7) {
                const buttonKey = `button${buttonNumber}`;
                buttonCounts[buttonKey as keyof typeof buttonCounts]++;
              }
            }
            
            // 또는 target_text로도 확인 (button 1, button 2, ...)
            // const textMatch = event.target_text?.match(/button (\d+)/);
            // if (textMatch) {
            //   const buttonNumber = parseInt(textMatch[1]);
            //   if (buttonNumber >= 1 && buttonNumber <= 7) {
            //     const buttonKey = `button${buttonNumber}`;
            //     buttonCounts[buttonKey as keyof typeof buttonCounts]++;
            //   }
            // }
          });
          
          // 차트 업데이트
          updateChartsFromData(buttonCounts);
        }

        setIsConnected(true);
      } catch (error) {
        console.error('API 호출 오류:', error);
        setIsConnected(false);
      }
    };
    
    const pollingInterval = 500;
    const interval = setInterval(pollData, pollingInterval);
    pollData(); // 즉시 첫 번째 호출
    
    return () => clearInterval(interval);
  }, [filters.mainCategory, filters.subCategory]); // 필터가 변경될 때마다 다시 실행

  // 필터링된 데이터 계산 함수
  const getFilteredData = (buttonClicks: Record<string, number>) => {
    // API에서 받은 실제 데이터를 그대로 사용
    return buttonClicks;
  };

  // 차트 업데이트 함수
  const updateChartsFromData = (buttonClicks: Record<string, number>) => {
    const filteredClicks = getFilteredData(buttonClicks);
    const totalClicks = Object.values(filteredClicks).reduce((sum, count) => sum + Number(count), 0);
    
          if (totalClicks > 0) {
        // 파이차트 업데이트
        const newPieData = barChartData.map((item, index) => {
          const buttonId = `button${index + 1}`;
          const clickCount = filteredClicks[buttonId] || 0;
          return {
            label: item.label,
            value: Math.round((Number(clickCount) / totalClicks) * 100),
            color: pieChartData[index]?.color || '#3B82F6'
          };
        });
        setPieChartData(newPieData);
        
        // 랭킹 업데이트
        const sortedButtons = Object.entries(filteredClicks)
          .map(([buttonId, count]) => ({
            buttonId,
            count: Number(count),
            index: parseInt(buttonId.replace('button', '')) - 1
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        
        const newRankingData = sortedButtons.map((item, rankIndex) => ({
          rank: rankIndex + 1,
          name: `button ${item.index + 1}`,
          value: item.count,
          change: 0, // 실제로는 이전 데이터와 비교
          icon: ['🔴', '🔵', '🟢'][rankIndex]
        }));
        
        setRankingData(newRankingData);
      }
  };

  const maxBarValue = Math.max(...barChartData.map(d => d.value));

  return (
    <div className="space-y-8">

      {/* 연결 상태 표시 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {isConnected ? '외부 페이지 연결됨' : '외부 페이지 연결 중...'}
            </h2>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isConnected ? '실시간 데이터 수신 중' : '연결 대기 중'}
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          💡 외부 페이지에서 버튼을 클릭하면 실시간으로 차트가 업데이트됩니다!
          <br />
          📍 외부 페이지: <span className="font-mono bg-gray-100 px-2 py-1 rounded">http://43.200.8.73/</span>
        </div>
      </div>

      {/* 필터 */}
      <TestFilterTabs filters={filters} onFilterChange={handleFilterChange} />
      
      {/* 막대그래프 섹션 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">버튼 클릭 횟수</h2>
        </div>
        
        <div className="flex items-end justify-between h-64 px-4 pb-4">
          {barChartData.map((item, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="text-sm text-gray-600 mb-2">{item.value.toLocaleString()}</div>
              <div 
                className="w-12 bg-blue-500 rounded-t-lg transition-all duration-300 hover:bg-blue-600"
                style={{ 
                  height: maxBarValue > 0 ? `${(item.value / maxBarValue) * 200}px` : '0px',
                  backgroundColor: item.color 
                }}
              />
              <div className="text-sm text-gray-600 mt-2">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 파이차트와 랭킹 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 파이차트 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">버튼 클릭 비율</h2>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              {/* 파이차트 시각화 */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {pieChartData.map((item, index) => {
                  const total = pieChartData.reduce((sum, d) => sum + d.value, 0);
                  const percentage = (item.value / total) * 100;
                  const startAngle = pieChartData
                    .slice(0, index)
                    .reduce((sum, d) => sum + (d.value / total) * 360, 0);
                  const endAngle = startAngle + (item.value / total) * 360;
                  
                  const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                  const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                  const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
                  const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
                  
                  const largeArcFlag = percentage > 50 ? 1 : 0;
                  
                  return (
                    <path
                      key={index}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                      fill={item.color}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  );
                })}
              </svg>
              
              {/* 중앙 텍스트 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                </div>
              </div>
            </div>
          </div>
          
          {/* 범례 */}
          <div className="mt-6 space-y-2">
            {pieChartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 랭킹 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">버튼 클릭 랭킹</h2>
          </div>
          
          <div className="space-y-4">
            {rankingData.map((item) => (
              <div key={item.rank} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-200">
                    {item.rank === 1 && <span className="text-yellow-500">🥇</span>}
                    {item.rank === 2 && <span className="text-gray-400">🥈</span>}
                    {item.rank === 3 && <span className="text-orange-500">🥉</span>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.value.toLocaleString()} 클릭
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${
                    item.change >= 0 ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    item.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test; 
