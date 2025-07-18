const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");
const { randomUUID } = require("crypto");

// GET /api/rules - 모든 이벤트 규칙 조회
router.get("/", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;

  try {
    const query = `
      SELECT *
      FROM klicklab.event_rules
      WHERE sdk_key = '${sdk_key}'
    `;
    const resultSet = await clickhouse.query({ query, format: "JSONEachRow" });
    const rules = await resultSet.json();
    res.status(200).json(rules);
  } catch (error) {
    console.error("Error fetching event rules:", error);
    res.status(500).json({ error: "Failed to fetch event rules" });
  }
});

// POST /api/rules - 새 이벤트 규칙 생성
router.post("/", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const {
    new_event_name,
    source_event_name,
    condition_type,
    condition_parameter,
    condition_value,
  } = req.body;

  if (!new_event_name || !source_event_name || !condition_type || !condition_parameter || !condition_value) {
    return res.status(400).json({ error: "All rule fields are required" });
  }

  const rule_id = randomUUID();

  try {
    await clickhouse.insert({
      table: "klicklab.event_rules",
      values: [
        {
          rule_id,
          sdk_key,
          new_event_name,
          source_event_name,
          condition_type,
          condition_parameter,
          condition_value,
        },
      ],
      format: "JSONEachRow",
    });
    res.status(201).json({ message: "Event rule created successfully", rule_id });
  } catch (error) {
    console.error("Error creating event rule:", error);
    res.status(500).json({ error: "Failed to create event rule" });
  }
});

// DELETE /api/rules/:rule_id - 이벤트 규칙 삭제
router.delete("/:rule_id", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { rule_id } = req.params;

  try {
    // ClickHouse는 DELETE가 비동기적으로 처리됩니다.
    const query = `
      ALTER TABLE klicklab.event_rules
      DELETE WHERE rule_id = '${rule_id}' AND sdk_key = '${sdk_key}'
    `;
    await clickhouse.command({ query });

    res.status(200).json({ message: "Event rule deleted successfully" });
  } catch (error) {
    console.error("Error deleting event rule:", error);
    res.status(500).json({ error: "Failed to delete event rule" });
  }
});


module.exports = router;
