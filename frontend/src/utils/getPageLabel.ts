// utils/getPageLabel.ts

/**
 * 주어진 URL 경로를 사용자 친화적인 페이지명으로 변환합니다.
 * @param path 원래의 URL 경로 (예: "/products/3")
 * @returns 한글 페이지 라벨 (예: "상품상세")
 */
export function getPageLabel(path: string): string {
    if (path === '/') return '메인페이지';
    if (path.startsWith('/products/')) return '상품상세';
    if (path === '/products') return '상품목록';
    if (path === '/cart') return '장바구니';
    if (path === '/checkout/success') return '결제완료';
    if (path === '/checkout') return '결제';
    if (path === '/login') return '로그인';
    if (path === '/register') return '회원가입';
    if (path === '/orders') return '주문내역';
    if (path === '/wishlist') return '위시리스트';
    if (path === '/mypage') return '마이페이지';
    return path; // fallback
}
