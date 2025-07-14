// services/pageService.js

const clickhouse = require('../src/config/clickhouse'); // 싱글턴 클라이언트

async function getStartPages({ from, to, limit = 50 }) {
    const sql = `
      SELECT page_path, sum(sessions) AS sessions
      FROM   klicklab.first_pages_daily
      WHERE  event_date BETWEEN {from:Date} AND {to:Date}
      GROUP  BY page_path
      ORDER  BY sessions DESC
      LIMIT  {limit:UInt16};
    `;
    const res = await clickhouse.query({
        query: sql,
        query_params: { from, to, limit: Number(limit) },
        format: 'JSONEachRow'
    });
    return res.json();
}

module.exports = { getStartPages };