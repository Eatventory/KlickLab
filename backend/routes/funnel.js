/**
 * 컨트롤러 계층
 *  └─ HTTP 요청/응답, 인증 미들웨어만 처리
 *
 * 실제 쿼리·집계 규칙은 services/funnelService.js 로 위임
 */
const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { getNextSteps, getMultiStepPaths } = require('../services/funnelService');
const { getStartPages } = require('../services/pageService');
const router = express.Router();


router.get('/path/next', authMiddleware, async (req, res) => {
    try {
        const { page, from, to, limit } = req.query;
        const { sdk_key } = req.user;  // JWT에서 SDK 키 추출

        if (!page || !from || !to) {
            return res.status(400).json({ error: 'page, from, to are required' });
        }

        const rows = await getNextSteps({ page, from, to, limit, sdk_key });
        res.json(rows);
    } catch (e) {
        console.error('path/next ERROR', e);
        res.status(500).json({ error: 'query failed' });
    }
});

router.get('/start-pages', authMiddleware, async (req, res) => {
    try {
        const { sdk_key } = req.user;  // JWT에서 SDK 키 추출
        const rows = await getStartPages({ ...req.query, sdk_key });
        res.json(rows);
    } catch (e) {
        console.error('start-pages ERROR', e);
        res.status(500).json({ error: 'query failed' });
    }
});

// 다단계 경로 조회 API
router.post('/path/multi-step', authMiddleware, async (req, res) => {
    try {
        const { steps, from, to, limit } = req.body;
        const { sdk_key } = req.user;

        if (!steps || !Array.isArray(steps) || steps.length === 0) {
            return res.status(400).json({ error: 'steps array is required' });
        }

        const result = await getMultiStepPaths({ steps, from, to, limit, sdk_key });
        res.json(result);
    } catch (e) {
        console.error('multi-step ERROR', e);
        res.status(500).json({ error: 'query failed' });
    }
});

module.exports = router;
