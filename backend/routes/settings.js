const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/get-key', authMiddleware, (req, res) => {
  const { sdk_key } = req.user;
  res.status(200).json(sdk_key);
});

const AVAILABLE_EVENTS = ['is_payment', 'is_signup', 'add_to_cart', 'contact_submit'];

// 사용 가능한 전환 이벤트 목록 조회
router.get('/conversion-events', authMiddleware, (req, res) => {
  res.json({ events: AVAILABLE_EVENTS });
});

// 현재 설정된 전환 이벤트 조회
router.get('/current-conversion-event', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;

  try {
    const result = await clickhouse.query({
      query: `
        SELECT event FROM users
        WHERE sdk_key = '${sdk_key}'
      `,
      format: 'JSON',
    });

    const rows = await result.json();
    const currentEvent = rows[0]?.event || 'is_payment';

    res.json({ currentEvent });
  } catch (err) {
    console.error('[GET current-conversion-event] Error:', err);
    res.status(500).json({ message: '전환 이벤트 조회 실패' });
  }
});

// 전환 이벤트 설정
router.post('/conversion-event', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { event } = req.body;

  if (!AVAILABLE_EVENTS.includes(event)) {
    return res.status(400).json({ success: false, message: '유효하지 않은 이벤트입니다.' });
  }

  try {
    await clickhouse.command({
      query: `
        ALTER TABLE klicklab.users
        UPDATE event = '${event}'
        WHERE sdk_key = '${sdk_key}'
      `,
    });

    res.json({ success: true, currentEvent: event });
  } catch (err) {
    console.error('[POST conversion-event] Error:', err);
    res.status(500).json({ success: false, message: '전환 이벤트 저장 실패' });
  }
});

module.exports = router;
