const clickhouse = require("../src/config/clickhouse");

async function getStartPages({ from, to, limit = 50, sdk_key }) {
  const sql = `
    SELECT page_path, sum(sessions) AS sessions
    FROM   first_pages_daily
    WHERE  event_date BETWEEN toDate('${from}') AND toDate('${to}')
      AND sdk_key = '${sdk_key}'
    GROUP  BY page_path
    ORDER  BY sessions DESC
    LIMIT  ${limit};
  `;
  const res = await clickhouse.query({
    query: sql,
    query_params: { from, to, limit: Number(limit) },
    format: "JSONEachRow",
  });
  return res.json();
}

module.exports = { getStartPages };