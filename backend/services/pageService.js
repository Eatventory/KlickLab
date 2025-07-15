const clickhouse = require("../src/config/clickhouse");

async function getStartPages({ query, sdk_key }) {
  const { from, to, limit = 50 } = query;
  const sql = `
    SELECT page_path, sum(sessions) AS sessions
    FROM   first_pages_daily
    WHERE  event_date BETWEEN ${from} AND ${to}
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