// ConversionRateWidget.tsx
import React, { useState, useEffect } from 'react';

export const ConversionRateWidget: React.FC = () => {
  const [conversionData, setConversionData] = useState({
    total_sessions: 0,
    total_conversions: 0,
    conversion_rate: 0
  });

  useEffect(() => {
    const fetchConversionRate = async () => {
      try {
        const token = localStorage.getItem('klicklab_token');
        const response = await fetch(`/api/dashboard/conversion-rate`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setConversionData(data);
        }
      } catch (error) {
        console.error('Failed to fetch conversion rate:', error);
      }
    };

    fetchConversionRate();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">전환율</h3>
      <div className="text-3xl font-bold text-blue-600">
        {conversionData.conversion_rate.toFixed(2)}%
      </div>
      <div className="text-sm text-gray-600 mt-2">
        {conversionData.total_conversions.toLocaleString()} / {conversionData.total_sessions.toLocaleString()} 세션
      </div>
    </div>
  );
};