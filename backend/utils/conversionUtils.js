function buildConversionQuery({ fromPage, toPage, sdk_key, startDate, endDate }) {
  return `
    WITH
    filtered_events AS (
      SELECT session_id, page_path, timestamp
      FROM events
      WHERE page_path IN ('${fromPage}', '${toPage}')
        AND timestamp BETWEEN toDateTime('${startDate}') AND toDateTime('${endDate}')
        AND sdk_key = '${sdk_key}'
    ),
    a_sessions AS (
      SELECT session_id, min(timestamp) AS a_time
      FROM filtered_events
      WHERE page_path = '${fromPage}'
      GROUP BY session_id
    ),
    b_sessions AS (
      SELECT session_id, min(timestamp) AS b_time
      FROM filtered_events
      WHERE page_path = '${toPage}'
      GROUP BY session_id
    ),
    joined_sessions AS (
      SELECT a.session_id
      FROM a_sessions a
      INNER JOIN b_sessions b ON a.session_id = b.session_id AND a.a_time < b.b_time
    )
    SELECT
      (SELECT count() FROM joined_sessions) AS converted,
      (SELECT count() FROM a_sessions) AS total,
      round(100.0 * (SELECT count() FROM joined_sessions) / nullIf((SELECT count() FROM a_sessions), 0), 1) AS conversion_rate
  `;
}

async function getConversionRate(client, params) {
  const query = buildConversionQuery(params);
  const res = await client.query({ query, format: "JSONEachRow" });
  const [row] = await res.json();

  return {
    converted: row?.converted || 0,
    total: row?.total || 0,
    rate: row?.conversion_rate || 0,
  };
}

module.exports = { buildConversionQuery, getConversionRate };
