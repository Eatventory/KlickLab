export const SegmentGroupCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
      {/* 랭킹 & 클릭 수 */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-16 bg-gray-200 rounded-full" />
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>

      {/* 세그먼트 정보 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-100 rounded w-32" />
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded w-10 mx-auto" />
          <div className="h-5 bg-gray-200 rounded w-12 mx-auto" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded w-10 mx-auto" />
          <div className="h-5 bg-gray-200 rounded w-12 mx-auto" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded w-10 mx-auto" />
          <div className="h-5 bg-gray-200 rounded w-12 mx-auto" />
        </div>
      </div>

      {/* 클릭 패턴 */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-3">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex justify-between items-center text-sm"
          >
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>

      {/* 사용자 분포 */}
      <div className="bg-blue-50 rounded-lg p-3 space-y-3">
        <div className="h-4 w-24 bg-blue-200 rounded" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex justify-between items-center text-xs"
          >
            <div className="h-3 w-12 bg-blue-200 rounded" />
            <div className="w-16 h-1.5 bg-blue-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};
