const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");

// GET /api/conversion-events - 전환 이벤트 목록 조회
router.get("/", authMiddleware, async (req, res) => {
    const { sdk_key } = req.user;
    
    try {
        const query = `
            SELECT 
                event_name,
                description,
                is_active,
                created_at,
                updated_at
            FROM klicklab.conversion_events
            WHERE sdk_key = '${sdk_key}'
                AND is_active = 1
            ORDER BY created_at DESC
        `;
        
        const resultSet = await clickhouse.query({ 
            query, 
            format: "JSONEachRow" 
        });
        const events = await resultSet.json();
        
        res.status(200).json(events);
    } catch (error) {
        console.error("Error fetching conversion events:", error);
        res.status(500).json({ error: "Failed to fetch conversion events" });
    }
});

// POST /api/conversion-events - 전환 이벤트 추가
router.post("/", authMiddleware, async (req, res) => {
    const { sdk_key } = req.user;
    const { event_name, description } = req.body;
    
    if (!event_name) {
        return res.status(400).json({ error: "Event name is required" });
    }
    
    try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await clickhouse.insert({
            table: "klicklab.conversion_events",
            format: 'JSONStringsEachRow',
            values: [{
                sdk_key,
                event_name,
                description: description || '',
                is_active: 1,
                created_at: now,
                updated_at: now
            }],
            format: "JSONEachRow"
        });
        
        // Dictionary 수동 갱신
        await clickhouse.command({
            query: "SYSTEM RELOAD DICTIONARY klicklab.conversion_events_dict"
        });
        
        res.status(201).json({ 
            message: "Conversion event created successfully",
            event_name 
        });
    } catch (error) {
        console.error("Error creating conversion event:", error);
        res.status(500).json({ error: "Failed to create conversion event" });
    }
});


// DELETE /api/conversion-events/:event_name - 전환 이벤트 삭제
router.delete("/:event_name", authMiddleware, async (req, res) => {
    const { sdk_key } = req.user;
    const { event_name } = req.params;
    
    try {
        // 소프트 삭제 (is_active = 0)
        const query = `
            ALTER TABLE klicklab.conversion_events
            UPDATE is_active = 0, updated_at = now()
            WHERE sdk_key = '${sdk_key}'
            AND event_name = '${event_name}'
        `;
        
        await clickhouse.command({ query });
        
        // Dictionary 갱신
        await clickhouse.command({
            query: "SYSTEM RELOAD DICTIONARY klicklab.conversion_events_dict"
        });
        
        res.status(200).json({ message: "Conversion event deleted successfully" });
    } catch (error) {
        console.error("Error deleting conversion event:", error);
        res.status(500).json({ error: "Failed to delete conversion event" });
    }
});

// GET /api/conversion-events/stats - 집계 테이블 활용
// 일단 통계는 사용 보류
router.get("/stats", authMiddleware, async (req, res) => {
    const { sdk_key } = req.user;
    const { start_date = 'today() - 7', end_date = 'today()' } = req.query;
    
    try {
        // daily_overview_agg에서 전환 데이터 조회
        const conversionStatsQuery = `
            SELECT 
                summary_date,
                sumMerge(conversions_state) AS conversions,
                uniqMerge(session_count_state) AS sessions,
                round(conversions * 100.0 / sessions, 2) AS conversion_rate
            FROM klicklab.daily_overview_agg
            WHERE sdk_key = '${sdk_key}'
                AND summary_date BETWEEN ${start_date} AND ${end_date}
            GROUP BY summary_date
            ORDER BY summary_date DESC
        `;
        
        // 개별 전환 이벤트별 통계
        const eventStatsQuery = `
            WITH conversion_events_list AS (
                SELECT event_name 
                FROM klicklab.conversion_events 
                WHERE sdk_key = '${sdk_key}' AND is_active = 1
            )
            SELECT 
                dea.event_name,
                sumMerge(dea.event_count_state) AS total_count,
                uniqMerge(dea.unique_users_state) AS unique_users,
                dea.summary_date
            FROM klicklab.daily_event_agg dea
            WHERE dea.sdk_key = '${sdk_key}'
                AND dea.summary_date BETWEEN ${start_date} AND ${end_date}
                AND dea.event_name IN (SELECT event_name FROM conversion_events_list)
            GROUP BY dea.event_name, dea.summary_date
            ORDER BY dea.summary_date DESC, total_count DESC
        `;
        
        const [conversionResult, eventResult] = await Promise.all([
            clickhouse.query({ query: conversionStatsQuery, format: "JSONEachRow" }),
            clickhouse.query({ query: eventStatsQuery, format: "JSONEachRow" })
        ]);
        
        const conversionStats = await conversionResult.json();
        const eventStats = await eventResult.json();
        
        res.status(200).json({
            overall: conversionStats,
            byEvent: eventStats
        });
    } catch (error) {
        console.error("Error fetching conversion stats:", error);
        res.status(500).json({ error: "Failed to fetch conversion stats" });
    }
});
// GET /api/conversion-events/available - 사용자 정의 이벤트만 조회
router.get("/available", authMiddleware, async (req, res) => {
    const { sdk_key } = req.user;
    
    try {
        // 이미 전환 이벤트로 등록된 것들
        const registeredQuery = `
            SELECT event_name 
            FROM klicklab.conversion_events 
            WHERE sdk_key = '${sdk_key}' 
                AND is_active = 1
        `;
        const registeredResult = await clickhouse.query({ 
            query: registeredQuery, 
            format: "JSONEachRow" 
        });
        const registeredEvents = await registeredResult.json();
        const registeredEventNames = registeredEvents.map(e => e.event_name);
        
        // event_rules에서 정의된 이벤트
        const rulesQuery = `
            SELECT DISTINCT
                new_event_name AS event_name,
                'rule' AS source_type,
                count() AS definition_count,
                formatDateTime(max(created_at), '%Y-%m-%d') AS created_date
            FROM klicklab.event_rules
            WHERE sdk_key = '${sdk_key}'
                AND new_event_name NOT IN (${registeredEventNames.map(e => `'${e}'`).join(',') || "''"})
            GROUP BY new_event_name
        `;
        
        // event_button에서 정의된 이벤트
        const buttonQuery = `
            SELECT DISTINCT
                event_name,
                'button' AS source_type,
                count() AS definition_count,
                formatDateTime(max(created_at), '%Y-%m-%d') AS created_date,
                groupArray(description) AS descriptions
            FROM klicklab.event_button
            WHERE sdk_key = '${sdk_key}'
                AND event_name NOT IN (${registeredEventNames.map(e => `'${e}'`).join(',') || "''"})
            GROUP BY event_name
        `;
        
        const [rulesResult, buttonResult] = await Promise.all([
            clickhouse.query({ query: rulesQuery, format: "JSONEachRow" }),
            clickhouse.query({ query: buttonQuery, format: "JSONEachRow" })
        ]);
        
        const rulesEvents = await rulesResult.json();
        const buttonEvents = await buttonResult.json();
        
        // 실제 발생 통계 추가 (선택사항)
        const eventNames = [
            ...rulesEvents.map(e => e.event_name),
            ...buttonEvents.map(e => e.event_name)
        ].filter(Boolean);
        
        let eventStats = {};
        if (eventNames.length > 0) {
            const statsQuery = `
                SELECT 
                    event_name,
                    count() AS event_count,
                    uniqExact(client_id) AS unique_users,
                    max(timestamp) AS last_seen
                FROM klicklab.events
                WHERE sdk_key = '${sdk_key}'
                    AND event_name IN (${eventNames.map(e => `'${e}'`).join(',')})
                    AND timestamp >= today() - 30
                GROUP BY event_name
            `;
            
            const statsResult = await clickhouse.query({ 
                query: statsQuery, 
                format: "JSONEachRow" 
            });
            const stats = await statsResult.json();
            
            stats.forEach(stat => {
                eventStats[stat.event_name] = {
                    event_count: stat.event_count,
                    unique_users: stat.unique_users,
                    last_seen: stat.last_seen
                };
            });
        }
        
        // 데이터 병합
        const availableEvents = [
            ...rulesEvents.map(event => ({
                ...event,
                ...eventStats[event.event_name],
                description: `URL 규칙으로 생성 (${event.definition_count}개 규칙)`
            })),
            ...buttonEvents.map(event => ({
                ...event,
                ...eventStats[event.event_name],
                description: event.descriptions[0] || `버튼 클릭으로 생성 (${event.definition_count}개 설정)`
            }))
        ];
        
        res.status(200).json({
            available: availableEvents,
            registered: registeredEventNames
        });
    } catch (error) {
        console.error("Error fetching available events:", error);
        res.status(500).json({ error: "Failed to fetch available events" });
    }
});

module.exports = router;