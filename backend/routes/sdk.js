// 파일명: routes/sdk.js
// 설명: 웹사이트에 설치된 SDK가 인증 없이 규칙을 가져가기 위한 공개 API입니다.

const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");

// GET /api/sdk/rules - 모든 규칙 조회 (통합)
router.get("/rules", async (req, res) => {
    const { sdk_key } = req.query;
    if (!sdk_key) {
        return res.status(400).json({ error: "SDK key is required" });
    }

    try {
        // 두 종류의 규칙을 병렬로 조회
        const [eventRulesResult, eventbuttonResult] = await Promise.all([
            clickhouse.query({
                query: `SELECT * FROM ttttest.event_rules WHERE sdk_key = '${sdk_key}'`,
                format: "JSONEachRow"
            }),
            clickhouse.query({
                query: `SELECT * FROM ttttest.event_button WHERE sdk_key = '${sdk_key}'`,
                format: "JSONEachRow"
            })
        ]);

        const eventRules = await eventRulesResult.json();
        const eventbutton = await eventbuttonResult.json();

        // 하나의 응답으로 조합
        res.status(200).json({
            eventRules,       // 이벤트 변환 규칙
            eventbutton   // 클릭 이벤트 규칙
        });

    } catch (error) {
        console.error("Error fetching all rules for SDK:", error);
        res.status(500).json({ error: "Failed to fetch rules for SDK" });
    }
});

module.exports = router;