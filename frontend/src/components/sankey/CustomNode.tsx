import React from 'react';

const CustomNode: React.FC<any> = (props) => {
    const { x, y, width, height, index, payload } = props;
    
    const name = payload?.name || '';
    const sourceLinks = payload?.sourceLinks || [];
    const targetLinks = payload?.targetLinks || [];
    const depth = payload?.depth ?? 0;
    
    //console.log(`Node ${index}: name="${name}", x=${x}, y=${y}, width=${width}, height=${height}`);
    
    // 노드가 소스인지 타겟인지 확인 (기존 로직)
    const isNodeAtLeftmostColumn = depth === 0; // 가장 왼쪽 열에 있는 노드인지
    
    // 텍스트 위치를 결정하는 플래그
    let shouldPlaceTextOnLeft;

    if (index === 0) {
        // 0번 노드의 경우: 텍스트를 노드 오른쪽에 배치 (원하는 대로)
        shouldPlaceTextOnLeft = false;
    } else if (isNodeAtLeftmostColumn) {
        // 0번 노드를 제외한 가장 왼쪽 열의 노드 (지금은 없지만, 나중에 생길 수 있으니 고려)
        // 예를 들어 0번 아래에 다른 노드가 있다면, 이 텍스트는 왼쪽에 배치 (기존 isSource의 동작)
        shouldPlaceTextOnLeft = true; 
    } else {
        // 그 외 모든 노드 (오른쪽 열의 노드들): 텍스트를 노드 오른쪽에 배치 (기존 isSource의 동작과 동일)
        shouldPlaceTextOnLeft = false;
    }

    // 세션 수 계산 (기존 코드와 동일)
    let totalSessions = 0;
    if (sourceLinks.length > 0) {
        totalSessions = sourceLinks.reduce((sum: number, link: any) => sum + link.value, 0);
    } else if (targetLinks.length > 0) {
        totalSessions = targetLinks.reduce((sum: number, link: any) => sum + link.value, 0);
    }

    return (
        <g>
            {/* 노드 사각형 */}
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={isNodeAtLeftmostColumn ? '#3b82f6' : '#60a5fa'} // 왼쪽 열 노드만 파란색, 나머지는 하늘색
                opacity={0.9}
                rx={2}
            />
            
            {/* 노드 이름 - 디버깅을 위해 노드 내부에도 표시 */}
            <text
                x={x + width / 2}
                y={y + height / 2}
                fontSize={10}
                fill="white"
                dominantBaseline="middle"
                textAnchor="middle"
            >
                {index}
            </text>
            
            {/* 노드 이름 - 외부 */}
            {name && (
                <text
                    x={shouldPlaceTextOnLeft ? x  : x + width -88}
                    y={y + height / 2}
                    fontSize={12}
                    fill="#374151"
                    dominantBaseline="middle"
                    textAnchor={shouldPlaceTextOnLeft ? 'end' : 'start'}
                >
                    {name}
                </text>
            )}
            
            {/* 세션 수 */}
            {totalSessions > 0 && name && (
                <text
                    x={shouldPlaceTextOnLeft ? x - 8 : x + width + 8}
                    y={y + height / 2 + 16}
                    fontSize={11}
                    fill="#6b7280"
                    dominantBaseline="middle"
                    textAnchor={shouldPlaceTextOnLeft ? 'end' : 'start'}
                >
                    ({totalSessions} 세션)
                </text>
            )}
        </g>
    );
};

export default CustomNode;