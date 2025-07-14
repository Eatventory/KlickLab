/**
 * 컨트롤러 계층
 *  └─ HTTP 요청/응답, 인증 미들웨어만 처리
 *
 * 실제 쿼리·집계 규칙은 services/funnelService.js 로 위임
 */
const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { getNextSteps } = require('../services/funnelService');
const { getStartPages } = require('../services/pageService');

const router = express.Router();

/**
 * API 명세: GET /api/funnel/path/next
 * -----------------------------------------------
 * Query Params
 *   step   : '01_view'   (필수)  → 사용자가 클릭한 현재 퍼널 단계
 *   from   : '2025-07-01'(필수)  → 시작 날짜
 *   to     : '2025-07-14'(필수)  → 종료 날짜
 *   limit  : 5            (선택) → Top N 개수
 *
 * Response (200) 응답 예시
 * [
 *   { "target": "02_cart",        "sessions": 30000 },
 *   { "target": "drop_after_01",  "sessions":  9000 }
 * ]
 */
router.get('/path/next', async (req, res) => {
    try {
        const { page, from, to, limit } = req.query;
        if (!page || !from || !to) {
            return res.status(400).json({ error: 'page, from, to are required' });
        }
        const rows = await getNextSteps({ page, from, to, limit });
        res.json(rows);
    } catch (e) {
        console.error('path/next ERROR', e);
        res.status(500).json({ error: 'query failed' });
    }
});

router.get('/start-pages', async (req, res) => {
    try {
        const rows = await getStartPages(req.query);
        res.json(rows);
    } catch (e) {
        console.error('start-pages ERROR', e);
        res.status(500).json({ error: 'query failed' });
    }
});


module.exports = router;
