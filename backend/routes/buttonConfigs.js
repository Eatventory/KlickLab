// 파일명: routes/buttonConfigs.js
// 설명: 코드리스 클릭 이벤트 규칙을 관리하는 API입니다. (대시보드용)

const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");
const { randomUUID } = require("crypto");

// GET /api/codeless-configs - 코드리스 설정 목록 조회
router.get("/", authMiddleware, async (req, res) => {
    const { sdk_key } = req.user;
    try {
        const query = `SELECT * FROM ttttest.event_button WHERE sdk_key = '${sdk_key}' ORDER BY created_at DESC`;
        const resultSet = await clickhouse.query({ query, format: "JSONEachRow" });
        const configs = await resultSet.json();
        res.status(200).json(configs);
    } catch (error) {
        console.error("Error fetching button configs:", error);
        res.status(500).json({ error: "Failed to fetch button configs" });
    }
});

// POST /api/codeless-configs - 새 코드리스 설정 생성
router.post("/", authMiddleware, async (req, res) => {
    const { sdk_key } = req.user;
    const { event_name, css_selector, description } = req.body;
    if (!event_name || !css_selector) {
        return res.status(400).json({ error: "Event name and CSS selector are required" });
    }
    const config_id = randomUUID();
    try {
        await clickhouse.insert({
            table: "ttttest.event_button",
            values: [{ config_id, sdk_key, event_name, css_selector, description: description || '' }],
            format: "JSONEachRow",
        });
        res.status(201).json({ message: "event config created", config_id });
    } catch (error) {
        console.error("Error creating button configs:", error);
        res.status(500).json({ error: "Failed to create button configs" });
    }
});

// DELETE /api/codeless-configs/:config_id - 코드리스 설정 삭제
router.delete("/:config_id", authMiddleware, async (req, res) => {
    const { sdk_key } = req.user;
    const { config_id } = req.params;
    try {
        const query = `ALTER TABLE ttttest.event_button DELETE WHERE config_id = '${config_id}' AND sdk_key = '${sdk_key}'`;
        await clickhouse.command({ query });
        res.status(200).json({ message: "Codeless event config deleted" });
    } catch (error) {
        console.error("Error deleting button configs:", error);
        res.status(500).json({ error: "Failed to delete button configs" });
    }
});

module.exports = router;

