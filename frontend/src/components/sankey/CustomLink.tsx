// CustomLink.tsx - sankey 링크 디자인
import React from 'react';

const CustomLink: React.FC<any> = (props) => {
    // props 구조 확인
    // console.log('CustomLink props:', props);
    
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, value, payload } = props;
    
    // 좌표가 없을 경우 기본값 사용
    const sX = sourceX ?? 0;
    const tX = targetX ?? 0;
    const sY = sourceY ?? 0;
    const tY = targetY ?? 0;
    const sCX = sourceControlX ?? sX;
    const tCX = targetControlX ?? tX;
    const width = linkWidth ?? 1;
    
    // 베지어 곡선 경로 생성
    const path = `
        M${sX},${sY}
        C${sCX},${sY} ${tCX},${tY} ${tX},${tY}
    `;
    
    // value가 없으면 payload에서 찾기
    const linkValue = value ?? payload?.value ?? 0;

    return (
        <g>
            {/* 링크 경로 */}
            <path
                d={path}
                stroke="#d1d5db"
                strokeWidth={width}
                fill="none"
                opacity={0.45}
            />
            
            {/* 링크 중앙에 세션 수 표시 */}
            {linkValue > 0 && !isNaN(sX) && !isNaN(tX) && (
                <text
                    x={(sX + tX) / 2}
                    y={(sY + tY) / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={11}
                    fill="#6b7280"
                    style={{ pointerEvents: 'none' }}
                >
                    {linkValue}
                </text>
            )}
        </g>
    );
};

export default CustomLink;