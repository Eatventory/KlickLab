const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/get-key", authMiddleware, (req, res) => {
  const { sdk_key } = req.user;
  res.status(200).json(sdk_key);
});

const AVAILABLE_EVENTS = [
  "is_payment",
  "is_signup",
  "add_to_cart",
  "contact_submit",
];

// 사용 가능한 전환 이벤트 목록 조회
router.get("/conversion-events", authMiddleware, (req, res) => {
  res.json({ events: AVAILABLE_EVENTS });
});

// 현재 설정된 전환 이벤트 조회
router.get("/current-conversion-event", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;

  try {
    const result = await clickhouse.query({
      query: `
        SELECT event FROM users
        WHERE sdk_key = '${sdk_key}'
      `,
      format: "JSON",
    });

    const rows = await result.json();
    // ClickHouse 응답 파싱 방식 수정
    const currentEvent = rows.data?.[0]?.event || "is_payment";

    res.json({ currentEvent });
  } catch (err) {
    console.error("[GET current-conversion-event] Error:", err);
    res.status(500).json({ message: "전환 이벤트 조회 실패" });
  }
});

// 전환 이벤트 설정
router.post("/conversion-event", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { event } = req.body;

  if (!AVAILABLE_EVENTS.includes(event)) {
    return res
      .status(400)
      .json({ success: false, message: "유효하지 않은 이벤트입니다." });
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
    console.error("[POST conversion-event] Error:", err);
    res.status(500).json({ success: false, message: "전환 이벤트 저장 실패" });
  }
});

router.get("/get-domain", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;

  try {
    const dataRes = await clickhouse.query({
      query: `
        SELECT domain FROM users
        WHERE sdk_key = '${sdk_key}'
      `,
      format: "JSON",
    });
    const data = await dataRes.json();
    const domain = data.data[0]?.domain ?? '-';

    // 오늘 이벤트 수
    const todayRes = await clickhouse.query({
      query: `
        SELECT sumMerge(page_views_state) AS cnt
        FROM agg_page_content_stats
        WHERE sdk_key = '${sdk_key}' AND summary_date = today()
      `,
      format: "JSON",
    });

    // 과거 이벤트 수
    const pastRes = await clickhouse.query({
      query: `
        SELECT sum(page_views) AS cnt
        FROM flat_page_content_stats
        WHERE sdk_key = '${sdk_key}' AND summary_date < today()
      `,
      format: "JSON",
    });

    // 최신 이벤트 시간
    const latestRes = await clickhouse.query({
      query: `
        SELECT 
          formatDateTime(max(updated_at), '%Y-%m-%d %H:%i:%S') AS latest
        FROM flat_page_content_stats
        WHERE sdk_key = '${sdk_key}'
      `,
      format: "JSON",
    });

    const todayData = await todayRes.json();
    const pastData = await pastRes.json();
    const latestData = await latestRes.json();

    const todayCnt = Number(todayData.data?.[0]?.cnt ?? 0);
    const pastCnt = Number(pastData.data?.[0]?.cnt ?? 0);
    const eventCount = todayCnt + pastCnt;
    const lastEvent = latestData.data?.[0]?.latest ?? '-';

    res.status(200).json({
      domain,
      status: domain !== '-' ? 'active' : 'inactive',
      lastEvent,
      eventCount,
    });
  } catch (err) {
    console.error("[GET get-domain] Error:", err);
    res.status(500).json({ success: false, message: "도메인 불러오기 실패" });
  }
});

router.post("/update-domain", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { domain } = req.body;
  try {
    await clickhouse.command({
      query: `
        ALTER TABLE users
        UPDATE domain = '${domain}'
        WHERE sdk_key = '${sdk_key}'
      `,
    });

    res.status(200).json(domain);
  } catch (err) {
    console.error("[POST update-domain] Error:", err);
    res.status(500).json({ success: false, message: "도메인 저장 실패" });
  }
});

module.exports = router;
