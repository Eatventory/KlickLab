import React from 'react';
import { UserPathSankeyChart } from '../user/UserPathSankeyChart';

export const SankeyFunnel: React.FC<{ data?: any[] }> = ({ data }) => {
  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #e5e7eb', padding: 24, marginTop: 32, border: '1.5px solid #e5e7eb' }}>
      <UserPathSankeyChart data={data} />
    </div>
  );
}; 